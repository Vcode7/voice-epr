import {
  ExtractedIntentResult,
  ExtractedReceiptResult,
  FinancialQueryResult,
  DataTemplate,
  ExtractedDataResult,
  FlexibleExtractedResult,
  FlexibleField,
  FlexibleTable,
  ExtractedPrescriptionResult,
} from '../../types';
import { dbSettings } from '../db/models';
import { normalizeAndAutoFillTemplateData } from '../utils/autoFillHelper';
import { normalizeDateToDDMMYYYY, isDateField, getTodayString } from '../utils/dateUtils';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const LLM_MODEL = 'qwen/qwen3.6-27b';
const WHISPER_MODEL = 'whisper-large-v3';

// Helper to sanitize & extract JSON from LLM response
const cleanAndParseJson = <T>(text: string): T => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
};

export interface KeyStatusInfo {
  hasEnvKey: boolean;
  hasCustomKey: boolean;
  isConfigured: boolean;
  activeKeyType: 'primary_env' | 'backup_custom' | 'none';
  totalConfiguredKeys?: number;
  keyLabels?: string[];
}

interface GroqKeyEntry {
  key: string;
  label: string;
}

export class GroqServer {
  private static async getAllKeys(customKeyOverride?: string | null): Promise<GroqKeyEntry[]> {
    const settings = await dbSettings.get();
    const keys: GroqKeyEntry[] = [];
    const seen = new Set<string>();

    const addKey = (rawKey: string | undefined | null, label: string) => {
      if (!rawKey) return;
      const trimmed = rawKey.trim();
      if (
        trimmed !== '' &&
        !trimmed.includes('your_groq_api_key') &&
        !trimmed.includes('your_fallback_key') &&
        !seen.has(trimmed)
      ) {
        seen.add(trimmed);
        keys.push({ key: trimmed, label });
      }
    };

    // Base primary key
    addKey(process.env.GROQ_API_KEY, 'Base Primary .env Key');

    // Static fallback env references for Next.js bundler (1 through 10)
    addKey(process.env.GROQ_API_KEY_FALLBACK1, '.env Fallback Key #1');
    addKey(process.env.GROQ_API_KEY_FALLBACK2, '.env Fallback Key #2');
    addKey(process.env.GROQ_API_KEY_FALLBACK3, '.env Fallback Key #3');
    addKey(process.env.GROQ_API_KEY_FALLBACK4, '.env Fallback Key #4');
    addKey(process.env.GROQ_API_KEY_FALLBACK5, '.env Fallback Key #5');
    addKey(process.env.GROQ_API_KEY_FALLBACK6, '.env Fallback Key #6');
    addKey(process.env.GROQ_API_KEY_FALLBACK7, '.env Fallback Key #7');
    addKey(process.env.GROQ_API_KEY_FALLBACK8, '.env Fallback Key #8');
    addKey(process.env.GROQ_API_KEY_FALLBACK9, '.env Fallback Key #9');
    addKey(process.env.GROQ_API_KEY_FALLBACK10, '.env Fallback Key #10');

    // Dynamic discovery for any other GROQ_API_KEY_FALLBACK* env keys
    if (typeof process !== 'undefined' && process.env) {
      const dynamicFallbackKeys = Object.keys(process.env)
        .filter((k) => k.startsWith('GROQ_API_KEY_FALLBACK'))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
          const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
          return numA - numB;
        });

      for (const envKeyName of dynamicFallbackKeys) {
        const numMatch = envKeyName.match(/FALLBACK(\d+)/i);
        const label = numMatch ? `.env Fallback Key #${numMatch[1]}` : `.env Fallback (${envKeyName})`;
        addKey(process.env[envKeyName], label);
      }
    }

    // User settings custom key override
    addKey(customKeyOverride || settings.customGroqApiKey, 'User Settings Key');

    return keys;
  }

  public static async getKeyStatus(): Promise<KeyStatusInfo> {
    const keys = await this.getAllKeys();
    const settings = await dbSettings.get();
    const envKey = process.env.GROQ_API_KEY;
    const hasEnvKey = !!(envKey && envKey.trim() !== '' && !envKey.includes('your_groq_api_key'));
    const customKey = settings.customGroqApiKey?.trim() || null;
    const hasCustomKey = !!(customKey && customKey !== '');

    return {
      hasEnvKey,
      hasCustomKey,
      isConfigured: keys.length > 0,
      activeKeyType: keys.length > 0 ? (hasEnvKey ? 'primary_env' : 'backup_custom') : 'none',
      totalConfiguredKeys: keys.length,
      keyLabels: keys.map((k) => k.label),
    };
  }

  private static isRateLimitError(status: number, errorText: string = ''): boolean {
    if (status === 429) return true;
    const lower = errorText.toLowerCase();
    return (
      lower.includes('rate_limit') ||
      lower.includes('rate limit') ||
      lower.includes('429') ||
      lower.includes('quota') ||
      lower.includes('tokens per minute') ||
      lower.includes('requests per minute') ||
      lower.includes('tokens per day') ||
      lower.includes('requests per day') ||
      lower.includes('tpm') ||
      lower.includes('rpm') ||
      lower.includes('tpd') ||
      lower.includes('rpd') ||
      lower.includes('too many requests')
    );
  }

  private static isFailoverEligibleError(status: number, errorText: string = ''): boolean {
    if (this.isRateLimitError(status, errorText)) return true;
    if (status === 401 || status === 403) return true;
    if (status >= 500 && status < 600) return true;
    if (status === 529) return true;
    const lower = errorText.toLowerCase();
    return (
      lower.includes('invalid api key') ||
      lower.includes('invalid_api_key') ||
      lower.includes('unauthorized') ||
      lower.includes('overloaded') ||
      lower.includes('service unavailable')
    );
  }

  private static async executeWithFailover<T>(
    operationName: string,
    customKeyOverride: string | null | undefined,
    operation: (apiKey: string) => Promise<T>
  ): Promise<T> {
    const keys = await this.getAllKeys(customKeyOverride);

    if (keys.length === 0) {
      throw new Error('Groq API Key is missing. Please add your key in Settings or .env file.');
    }

    let lastError: any = null;

    for (let i = 0; i < keys.length; i++) {
      const { key, label } = keys[i];
      try {
        console.log(`🔑 [Groq Server] Attempting ${operationName} with ${label} (${i + 1}/${keys.length})`);
        return await operation(key);
      } catch (error: any) {
        lastError = error;
        const status = error?.status || 0;
        const msg = error?.message || '';
        const errorText = error?.errorText || '';

        const isRateLimit =
          status === 429 ||
          this.isRateLimitError(status, msg) ||
          this.isRateLimitError(status, errorText);

        const isAuthError =
          status === 401 ||
          status === 403 ||
          msg.includes('401') ||
          msg.includes('403') ||
          msg.toLowerCase().includes('invalid api key') ||
          msg.toLowerCase().includes('unauthorized') ||
          errorText.toLowerCase().includes('invalid api key');

        const isServerError = (status >= 500 && status < 600) || status === 529;

        const canFailover = isRateLimit || isAuthError || isServerError;

        if (canFailover) {
          const reason = isRateLimit ? 'Rate limit hit' : isAuthError ? 'Auth failure' : 'Server capacity / outage';
          if (i < keys.length - 1) {
            console.warn(
              `⚠️ [Groq Server] ${label} (${reason}) during ${operationName}. Failing over to next key (${keys[i + 1].label})...`
            );
            continue;
          } else {
            console.error(
              `❌ [Groq Server] All ${keys.length} Groq API keys failed during ${operationName}. Last reason: ${reason}`
            );
            throw new Error(
              `All configured Groq keys (${keys.length}) were exhausted (rate limit / failure). Add another key in Settings or check .env.`
            );
          }
        }

        throw error;
      }
    }

    throw lastError || new Error('Groq API execution failed.');
  }

  /**
   * Transcribe Audio file buffer / blob using Groq Whisper API
   */
  public static async transcribeAudio(
    audioBlob: Blob | Buffer,
    filename: string = 'recording.webm',
    customKey?: string | null
  ): Promise<string> {
    return this.executeWithFailover('Whisper STT', customKey, async (apiKey) => {
      const formData = new FormData();
      if (audioBlob instanceof Blob) {
        formData.append('file', audioBlob, filename);
      } else {
        // Node Buffer
        const blob = new Blob([new Uint8Array(audioBlob as any)], { type: 'audio/webm' });
        formData.append('file', blob, filename);
      }

      formData.append('model', WHISPER_MODEL);
      formData.append('response_format', 'json');
      formData.append('language', 'en');

      const response = await fetch(GROQ_AUDIO_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Groq STT Error]', response.status, errorText);
        if (this.isFailoverEligibleError(response.status, errorText)) {
          const err = new Error(`Whisper Transcription failed (Status ${response.status}): ${errorText}`);
          (err as any).status = response.status;
          (err as any).errorText = errorText;
          throw err;
        }
        throw new Error(`Whisper Transcription failed (Status ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (!data.text || data.text.trim() === '') {
        throw new Error('No speech detected in recording.');
      }
      return data.text.trim();
    });
  }

  /**
   * Extract financial intent from transcript
   */
  public static async extractFinancialIntent(
    transcript: string,
    customKey?: string | null
  ): Promise<ExtractedIntentResult> {
    const keys = await this.getAllKeys(customKey);
    if (keys.length === 0) {
      return this.localHeuristicIntentParser(transcript);
    }

    const systemPrompt = `You are a precise Voice Finance AI entity extractor.
Your task is to parse spoken financial text into a JSON object.
A single transcript can contain one or multiple separate expenses/incomes (e.g., "today I purchased carrot for 50 rupees then again onion for 100 rupees and tomato for 500 rupees then I went to domino's and had pizza for 300 rupees").

Return ONLY a single valid raw JSON object matching this structure:

{
  "transactions": [
    {
      "intent": "expense",
      "amount": 50,
      "currency": "INR",
      "merchant": "carrot",
      "category": "Groceries",
      "payment_method": null,
      "transaction_type": "expense",
      "description": "carrot for 50 rupees",
      "date": null,
      "person_name": null,
      "target_category": null
    }
  ]
}

STRICT EXTRACTION RULES:
1. Create one object in the "transactions" array for EVERY separate expense/income item. Never combine separate items.
2. PAYMENT METHOD EXTRACTION:
   - Extract exact payment method if mentioned:
     - Cash: "Cash"
     - Cards: "Credit Card", "Debit Card", "RuPay Credit Card", "RuPay Debit Card", "Other Card"
     - UPI: "UPI", "Google Pay", "PhonePe", "Paytm", "Amazon Pay", "BHIM", "Other UPI"
   - If payment method is not explicitly mentioned in the voice command -> set "payment_method": null. NEVER default to "Cash".
3. NEVER INVENT DATA:
   - If merchant/payee is not mentioned -> set "merchant": null.
   - If date is not mentioned -> set "date": null.
4. CATEGORIZATION:
   - Vegetables, fruits, food ingredients (e.g., carrot, onion, tomato, rice, milk, vegetables, groceries) -> "Groceries".
   - Prepared food, pizza, restaurants, dining out (e.g., pizza, burger, restaurant, domino's) -> "Food".
   - Fuel, petrol, diesel -> "Fuel".
   - Subscriptions (e.g., Netflix, Spotify, Amazon Prime) -> "Subscriptions".
   - If category cannot be reasonably determined -> set "category": null.
5. PRESERVE USER FACTS:
   - Never alter the stated amount.
   - Preserve exact merchant / item names as spoken (e.g., "carrot", "onion", "tomato", "Domino's").
6. Allowed values for "transaction_type": "expense", "income", "transfer".
7. Allowed values for "intent": "expense", "income", "transfer", "lend", "borrow", "repayment", "query", "budget", "reminder", "correction", "unknown".`;

    try {
      return await this.executeWithFailover('LLM Intent Extraction', customKey, async (apiKey) => {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Transcript: "${transcript}"` },
            ],
            temperature: 0.1,
            reasoning_effort: 'none',
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (this.isFailoverEligibleError(response.status, errorText)) {
            const err = new Error(`Rate limit or API error hit (Status ${response.status}): ${errorText}`);
            (err as any).status = response.status;
            (err as any).errorText = errorText;
            throw err;
          }
          return this.localHeuristicIntentParser(transcript);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (!content) return this.localHeuristicIntentParser(transcript);

        const parsed = cleanAndParseJson<ExtractedIntentResult>(content);
        parsed.raw_transcript = transcript;

        const rawList = parsed.transactions || parsed.entries || [];
        if (rawList.length === 0) {
          rawList.push({
            intent: parsed.intent || 'expense',
            amount: parsed.amount ?? null,
            currency: parsed.currency || 'INR',
            merchant: parsed.merchant || null,
            category: parsed.category || null,
            payment_method: parsed.payment_method || null,
            transaction_type: parsed.transaction_type || 'expense',
            description: parsed.description || null,
            date: parsed.date || null,
            person_name: parsed.person_name || null,
            target_category: parsed.target_category || null,
          });
        }

        parsed.transactions = rawList.map((item) => ({
          intent: item.intent || 'expense',
          amount: item.amount ?? null,
          currency: item.currency || 'INR',
          merchant: item.merchant || null,
          category: item.category || null,
          payment_method: item.payment_method || null,
          transaction_type: item.transaction_type || 'expense',
          description: item.description || null,
          date: item.date || null,
          person_name: item.person_name || null,
          target_category: item.target_category || null,
        }));
        parsed.entries = parsed.transactions;

        return parsed;
      });
    } catch (e: any) {
      return this.localHeuristicIntentParser(transcript);
    }
  }

  /**
   * Extract Voice Receipt from transcript
   */
  public static async extractVoiceReceipt(
    transcript: string,
    customKey?: string | null
  ): Promise<ExtractedReceiptResult> {
    const keys = await this.getAllKeys(customKey);
    if (keys.length === 0) {
      return this.localHeuristicReceiptParser(transcript);
    }

    const systemPrompt = `You are an expert Tax Invoice & Voice Receipt Extractor.
Parse spoken items, quantities, units, unit prices, HSN/SAC codes, customer Bill To details (name, phone, address, GSTIN), discount, and GST/IGST into a valid JSON object.

Return ONLY a single valid raw JSON object matching this structure:

{
  "intent": "create_receipt",
  "items": [
    {
      "name": "Basmati Rice",
      "hsn_code": "1006",
      "quantity": 2,
      "unit": "kg",
      "unit_price": 100
    }
  ],
  "customer_name": null,
  "customer_phone": null,
  "customer_address": null,
  "customer_gstin": null,
  "discount": 0,
  "tax_percent": 18,
  "tax_type": "gst",
  "currency": "INR"
}

RULES:
1. Extract "hsn_code" if mentioned (e.g. "HSN 1006" or "SAC 9983" or a 4-8 digit code for the product/service), else null.
2. Extract customer Bill-To details if mentioned: "customer_name", "customer_phone", "customer_address", "customer_gstin".
3. Extract tax as a PERCENTAGE (e.g. "GST 18%" → tax_percent: 18). Do NOT compute the rupee tax amount yourself.
4. tax_type values:
   - "igst" → if user explicitly says "IGST" or inter-state
   - "gst" → if user says "GST", "tax", "CGST", "SGST" or any tax without specifying IGST
   - "none" → if no tax is mentioned at all (set tax_percent: 0)
5. discount is a flat rupee amount if mentioned, else 0.
6. Do NOT calculate grand totals; only extract individual line items, HSN, and tax percentage.`;

    try {
      return await this.executeWithFailover('Voice Receipt Extraction', customKey, async (apiKey) => {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Receipt Transcript: "${transcript}"` },
            ],
            temperature: 0.1,
            reasoning_effort: 'none',
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (this.isFailoverEligibleError(response.status, errorText)) {
            const err = new Error(`Rate limit or API error hit (Status ${response.status}): ${errorText}`);
            (err as any).status = response.status;
            (err as any).errorText = errorText;
            throw err;
          }
          return this.localHeuristicReceiptParser(transcript);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (!content) return this.localHeuristicReceiptParser(transcript);

        const parsed = cleanAndParseJson<ExtractedReceiptResult>(content);
        parsed.raw_transcript = transcript;
        return parsed;
      });
    } catch (e: any) {
      return this.localHeuristicReceiptParser(transcript);
    }
  }

  /**
   * Extract custom template data & repeated table rows
   */
  public static async extractCustomData(
    transcript: string,
    template: DataTemplate,
    customKey?: string | null
  ): Promise<ExtractedDataResult> {
    const keys = await this.getAllKeys(customKey);
    if (keys.length === 0) {
      return this.localHeuristicCustomDataParser(transcript, template);
    }

    const baseField = template.autoFill?.enabled
      ? template.fields.find((f) => f.extractionKey === template.autoFill?.baseFieldKey)
      : undefined;

    const fieldDescriptions = template.fields
      .map((f) => {
        let extra = '';
        if (template.autoFill?.enabled && template.autoFill.targetFieldKeys.includes(f.extractionKey)) {
          extra += ` [AUTOFILLED FIELD from "${baseField?.name || 'Base Field'}"]: Do NOT invent or fill this field; focus on extracting "${baseField?.name || 'Base Field'}" and other fields.`;
        }
        if (f.type === 'date' || isDateField(f.extractionKey) || isDateField(f.name)) {
          extra += ` [DATE FIELD: Must format as DD-MM-YYYY, e.g. "28-08-2026"]`;
        }
        if (f.options && f.options.length > 0) {
          extra += ` [ALLOWED VALUES ONLY: ${f.options.map((o) => `"${o}"`).join(', ')}] (CRITICAL: You MUST select ONLY one of these exact allowed values if mentioned or implied in the transcription)`;
        }
        if (f.placeholder) {
          extra += `, e.g. ${f.placeholder}`;
        }
        return `- "${f.extractionKey}" (${f.name}, type: ${f.type}${extra})`;
      })
      .join('\n');

    let tableSection = '';
    if (template.hasTable && template.tableFields && template.tableFields.length > 0) {
      const colDescriptions = template.tableFields
        .map((c) => {
          let extra = '';
          if (c.type === 'date' || isDateField(c.extractionKey) || isDateField(c.name)) {
            extra += ` [DATE FIELD: Must format as DD-MM-YYYY, e.g. "28-08-2026"]`;
          }
          if (c.options && c.options.length > 0) {
            extra += ` [ALLOWED VALUES ONLY: ${c.options.map((o) => `"${o}"`).join(', ')}] (CRITICAL: You MUST select ONLY one of these exact allowed values if mentioned in transcription)`;
          }
          if (c.placeholder) {
            extra += `, e.g. ${c.placeholder}`;
          }
          return `  * "${c.extractionKey}" (${c.name}, type: ${c.type}${extra})`;
        })
        .join('\n');
      tableSection = `
REPEATED ENTRIES TABLE ("${template.tableTitle || 'Repeated Entries'}"):
The user may dictate repeated entries, hourly production logs, cycle intervals, or multi-row entries.
Extract each repeated entry into the "tableRows" array with these column keys:
${colDescriptions}
`;
    }

    const systemPrompt = `You are an expert Voice-to-Data Entity Extractor for the "${template.name}" template.
Your goal is to parse spoken voice transcripts into structured JSON matching the defined fields and repeated entries table.

TOP-LEVEL FIELDS:
${fieldDescriptions}
${tableSection}

STRICT JSON OUTPUT FORMAT:
Return ONLY a valid raw JSON object matching this structure:
{
  "fieldValues": {
    // Key-value pairs for each top-level field using its exact extractionKey.
  },
  "tableRows": [
    // Array of objects for repeated entries table.
  ]
}

EXTRACTION GUIDELINES:
1. Use the EXACT extraction keys provided above.
2. Numeric fields: Extract as clean numbers or numeric strings.
3. Date fields: You MUST extract spoken dates and normalize them into DD-MM-YYYY format (e.g. "28 August 2026", "August 28 2026", "28/08/2026", "2026-08-28" all become "28-08-2026").
4. Time fields: Format as standard time (e.g. "08:30 AM") if mentioned.
5. FIXED / ALLOWED VALUE CONSTRAINTS: For any field or column with "[ALLOWED VALUES ONLY: ...]", you MUST select and return ONLY one of the specified allowed values from the transcript (e.g. if allowed values for shift are ["A", "B", "C"] and the speaker mentions "shift A", "first shift", "morning shift", "shift-A", or "A", you MUST output exactly "A"). Do NOT invent or return values outside the allowed options.
6. Repeated Entries Table: Extract multi-row intervals or batches into "tableRows".
7. Never invent facts not spoken by the user.`;

    try {
      return await this.executeWithFailover('Voice-to-Data Custom Extraction', customKey, async (apiKey) => {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Voice Dictation: "${transcript}"` },
            ],
            temperature: 0.1,
            reasoning_effort: 'none',
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (this.isFailoverEligibleError(response.status, errorText)) {
            const err = new Error(`Rate limit or API error hit (Status ${response.status}): ${errorText}`);
            (err as any).status = response.status;
            (err as any).errorText = errorText;
            throw err;
          }
          return this.localHeuristicCustomDataParser(transcript, template);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (!content) return this.localHeuristicCustomDataParser(transcript, template);

        const parsed = cleanAndParseJson<{
          fieldValues?: Record<string, any>;
          tableRows?: Array<Record<string, any>>;
          [key: string]: any;
        }>(content);

        const fieldValues: Record<string, any> = parsed.fieldValues || {};
        template.fields.forEach((f) => {
          if (fieldValues[f.extractionKey] === undefined && parsed[f.extractionKey] !== undefined) {
            fieldValues[f.extractionKey] = parsed[f.extractionKey];
          }

          // Normalize and enforce fixed options
          if (f.options && f.options.length > 0) {
            const rawVal = fieldValues[f.extractionKey];
            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
              const matched = GroqServer.matchAllowedOption(rawVal, f.options);
              if (matched) {
                fieldValues[f.extractionKey] = matched;
              } else {
                const fromTranscript = GroqServer.matchOptionFromTranscript(transcript, f.name, f.extractionKey, f.options);
                fieldValues[f.extractionKey] = fromTranscript || '';
              }
            } else {
              const fromTranscript = GroqServer.matchOptionFromTranscript(transcript, f.name, f.extractionKey, f.options);
              if (fromTranscript) {
                fieldValues[f.extractionKey] = fromTranscript;
              }
            }
          }
        });

        const tableRows: Array<Record<string, any>> = Array.isArray(parsed.tableRows)
          ? parsed.tableRows
          : Array.isArray(parsed.rows)
          ? parsed.rows
          : [];

        if (template.hasTable && template.tableFields && template.tableFields.length > 0) {
          tableRows.forEach((row) => {
            template.tableFields.forEach((c) => {
              if (c.options && c.options.length > 0 && row[c.extractionKey] !== undefined) {
                const matched = GroqServer.matchAllowedOption(row[c.extractionKey], c.options);
                if (matched) {
                  row[c.extractionKey] = matched;
                }
              }
            });
          });
        }

        // Normalize dates and apply Auto-Fill lookups & overrides
        const normalizedData = normalizeAndAutoFillTemplateData(fieldValues, tableRows, template);

        return {
          templateId: template.id,
          templateName: template.name,
          fieldValues: normalizedData.fieldValues,
          tableRows: normalizedData.tableRows,
          raw_transcript: transcript,
          lookupStatus: normalizedData.lookupStatus,
          invalidLookup: normalizedData.invalidLookup,
          invalidLookupMessage: normalizedData.invalidLookupMessage,
        };
      });
    } catch (e: any) {
      return this.localHeuristicCustomDataParser(transcript, template);
    }
  }

  /**
   * Autonomous Flexible Voice Extraction
   */
  public static async extractFlexibleData(
    transcript: string,
    customKey?: string | null
  ): Promise<FlexibleExtractedResult> {
    const keys = await this.getAllKeys(customKey);
    if (keys.length === 0) {
      return this.localHeuristicFlexibleParser(transcript);
    }

    const systemPrompt = `You are an expert Autonomous Voice-to-Data Entity & Table Extractor.
The user is dictating structured or semi-structured information WITHOUT any predefined schema.
Your goal is to parse all spoken information into:
1. Direct Field-Value Pairs ("fields"): Standalone key-value pairs (e.g., "Part no 1234", "date 20 August", "billing none", "operator Ravi").
   - Extract field names in clear Title Case (e.g. "Part No", "Date", "Billing", "Operator").
   - Extract values cleanly (e.g. "1234", "20 August", "None", "Ravi").
2. Detected Tables / Repeated Data ("table"): If the user dictates tabular, repeated, hourly, or multi-row entries:
   - Automatically detect the column headers as an array of strings in "headers".
   - Automatically extract each row's values matching the headers as an array of strings in "rows".

STRICT JSON OUTPUT STRUCTURE:
Return ONLY a valid raw JSON object matching this structure:
{
  "title": "Short descriptive summary title",
  "fields": [
    { "name": "Field Name In Title Case", "value": "Extracted Value" }
  ],
  "table": {
    "title": "Detected Table Title",
    "headers": ["Field1", "Field2", "Field3"],
    "rows": [
      ["Value1", "Value2", "Value3"],
      ["Value4", "Value5", "Value6"]
    ]
  } // or null if no tabular entries detected
}`;

    try {
      return await this.executeWithFailover('Voice-to-Data Flexible Extraction', customKey, async (apiKey) => {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Voice Dictation: "${transcript}"` },
            ],
            temperature: 0.1,
            reasoning_effort: 'none',
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (this.isFailoverEligibleError(response.status, errorText)) {
            const err = new Error(`Rate limit or API error hit (Status ${response.status}): ${errorText}`);
            (err as any).status = response.status;
            (err as any).errorText = errorText;
            throw err;
          }
          return this.localHeuristicFlexibleParser(transcript);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (!content) return this.localHeuristicFlexibleParser(transcript);

        const parsed = cleanAndParseJson<{
          title?: string;
          fields?: Array<{ name: string; value: any }>;
          table?: {
            title?: string;
            headers?: string[];
            rows?: Array<any[]>;
          } | null;
          [key: string]: any;
        }>(content);

        const rawFields = Array.isArray(parsed.fields) ? parsed.fields : [];
        const normalizedFields: FlexibleField[] = rawFields.map((f, idx) => {
          const fieldName = f.name || `Field ${idx + 1}`;
          let val = f.value !== null && f.value !== undefined ? f.value : '';
          if (isDateField(fieldName) && val) {
            val = normalizeDateToDDMMYYYY(val);
          }
          return {
            id: `flex_field_${idx}_${Date.now()}`,
            name: fieldName,
            value: val,
          };
        });

        if (normalizedFields.length === 0 && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v], idx) => {
            if (k !== 'title' && k !== 'table' && k !== 'fields' && typeof v !== 'object') {
              const formattedName = k
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
              let val = String(v);
              if (isDateField(formattedName) && val) {
                val = normalizeDateToDDMMYYYY(val);
              }
              normalizedFields.push({
                id: `flex_field_${idx}_${Date.now()}`,
                name: formattedName,
                value: val,
              });
            }
          });
        }

        let normalizedTable: FlexibleTable | null = null;
        if (parsed.table && typeof parsed.table === 'object') {
          const headers = Array.isArray(parsed.table.headers) ? parsed.table.headers : [];
          const rawRows = Array.isArray(parsed.table.rows) ? parsed.table.rows : [];
          if (headers.length > 0) {
            const rows = rawRows.map((r) => {
              if (Array.isArray(r)) {
                return r.map((c, colIdx) => {
                  let cellVal = c !== null && c !== undefined ? String(c) : '';
                  if (headers[colIdx] && isDateField(headers[colIdx]) && cellVal) {
                    cellVal = normalizeDateToDDMMYYYY(cellVal);
                  }
                  return cellVal;
                });
              } else if (typeof r === 'object' && r !== null) {
                return headers.map((h) => {
                  let cellVal = r[h] !== undefined ? String(r[h]) : '';
                  if (isDateField(h) && cellVal) {
                    cellVal = normalizeDateToDDMMYYYY(cellVal);
                  }
                  return cellVal;
                });
              }
              return headers.map(() => '');
            });
            normalizedTable = {
              title: parsed.table.title || 'Detected Table',
              headers,
              rows,
            };
          }
        }

        return {
          isFlexible: true,
          title: parsed.title || 'Flexible Voice Entry',
          fields: normalizedFields,
          table: normalizedTable,
          raw_transcript: transcript,
        };
      });
    } catch (e: any) {
      return this.localHeuristicFlexibleParser(transcript);
    }
  }

  /**
   * Parse financial queries for Ask Finance mode
   */
  public static async parseFinancialQuery(
    transcript: string,
    customKey?: string | null
  ): Promise<FinancialQueryResult> {
    const keys = await this.getAllKeys(customKey);
    if (keys.length === 0) {
      return { queryType: 'general', answerText: 'Offline mode active.' };
    }

    const systemPrompt = `You are a financial query analyzer.
Categorize natural language queries into safe parameters.

Return ONLY a valid raw JSON object matching this structure:
{
  "queryType": "category_total",
  "category": "Groceries",
  "paymentMethod": null,
  "period": "this_month"
}

Allowed queryType values: "category_total", "biggest_expense", "payment_method_total", "income_vs_expense", "count", "general".
Allowed period values: "this_month", "last_month", "all_time".`;

    try {
      return await this.executeWithFailover('Financial Query Parsing', customKey, async (apiKey) => {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Query: "${transcript}"` },
            ],
            temperature: 0.1,
            reasoning_effort: 'none',
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (this.isFailoverEligibleError(response.status, errorText)) {
            const err = new Error(`Rate limit or API error hit (Status ${response.status}): ${errorText}`);
            (err as any).status = response.status;
            (err as any).errorText = errorText;
            throw err;
          }
          return { queryType: 'general' };
        }

        const data = await response.json();
        return cleanAndParseJson<FinancialQueryResult>(data.choices[0]?.message?.content || '{}');
      });
    } catch (e: any) {
      return { queryType: 'general' };
    }
  }

  // --- Fallback Regex & Heuristic Parsers ---

  public static localHeuristicIntentParser(transcript: string): ExtractedIntentResult {
    const numbers = transcript.match(/\d+([.,]\d+)?/g);
    const chunks = numbers && numbers.length > 1
      ? transcript.split(/\b(?:and|also|plus|,|then|bought|spent|paid)\b/i)
      : [transcript];

    const entries = chunks
      .map((chunk) => {
        const lower = chunk.toLowerCase();
        const chunkNums = chunk.match(/\d+([.,]\d+)?/g);
        const amount = chunkNums ? parseFloat(chunkNums[0].replace(',', '')) : null;

        let intent: ExtractedIntentResult['intent'] = 'expense';
        let transaction_type: ExtractedIntentResult['transaction_type'] = 'expense';
        let category: string | null = 'Other';
        let payment_method: string | null = null;
        let merchant: string | null = null;
        let person_name: string | null = null;

        if (lower.includes('salary') || lower.includes('received') || lower.includes('earned') || lower.includes('income')) {
          intent = 'income';
          transaction_type = 'income';
          category = lower.includes('salary') ? 'Salary' : 'Other';
          if (lower.includes('salary')) merchant = 'Salary';
        } else if (lower.includes('gave') || lower.includes('lent') || lower.includes('lend')) {
          intent = 'lend';
          transaction_type = 'expense';
          const names = chunk.match(/(?:gave|lent)\s+([A-Z][a-z]+)/i);
          person_name = names ? names[1] : 'Friend';
        } else if (lower.includes('borrowed') || lower.includes('took from')) {
          intent = 'borrow';
          transaction_type = 'income';
          const names = chunk.match(/(?:borrowed|took from)\s+([A-Z][a-z]+)/i);
          person_name = names ? names[1] : 'Friend';
        } else if (lower.includes('netflix')) {
          category = 'Subscriptions';
          merchant = 'Netflix';
        } else if (lower.includes('amazon prime') || lower.includes('prime')) {
          category = 'Subscriptions';
          merchant = 'Amazon Prime';
        } else if (lower.includes('spotify')) {
          category = 'Subscriptions';
          merchant = 'Spotify';
        } else if (lower.includes('grocery') || lower.includes('groceries')) {
          category = 'Groceries';
          merchant = 'Grocery Shop';
        } else if (lower.includes('restaurant') || lower.includes('food') || lower.includes('swiggy') || lower.includes('zomato')) {
          category = 'Food';
          merchant = lower.includes('swiggy') ? 'Swiggy' : lower.includes('zomato') ? 'Zomato' : 'Food & Dining';
        } else if (lower.includes('petrol') || lower.includes('fuel')) {
          category = 'Fuel';
          merchant = 'Petrol Pump';
        } else if (lower.includes('rent')) {
          category = 'Rent';
          merchant = 'House Rent';
        }

        if (lower.includes('rupay credit card')) payment_method = 'RuPay Credit Card';
        else if (lower.includes('rupay debit card') || lower.includes('rupay card')) payment_method = 'RuPay Debit Card';
        else if (lower.includes('credit card')) payment_method = 'Credit Card';
        else if (lower.includes('debit card')) payment_method = 'Debit Card';
        else if (lower.includes('other card')) payment_method = 'Other Card';
        else if (lower.includes('google pay') || lower.includes('gpay')) payment_method = 'Google Pay';
        else if (lower.includes('phonepe') || lower.includes('phone pe')) payment_method = 'PhonePe';
        else if (lower.includes('paytm')) payment_method = 'Paytm';
        else if (lower.includes('amazon pay')) payment_method = 'Amazon Pay';
        else if (lower.includes('bhim')) payment_method = 'BHIM';
        else if (lower.includes('other upi')) payment_method = 'Other UPI';
        else if (lower.includes('upi')) payment_method = 'UPI';
        else if (lower.includes('cash')) payment_method = 'Cash';

        return {
          intent,
          amount,
          currency: 'INR',
          merchant,
          category,
          payment_method,
          transaction_type,
          description: chunk.trim(),
          date: null,
          person_name,
          target_category: null,
        };
      })
      .filter((e) => e.amount !== null || e.merchant !== null);

    const fallbackEntry = entries[0] || {
      intent: 'expense',
      amount: numbers ? parseFloat(numbers[0].replace(',', '')) : null,
      currency: 'INR',
      merchant: null,
      category: 'Other',
      payment_method: null,
      transaction_type: 'expense',
      description: transcript,
      date: null,
      person_name: null,
      target_category: null,
    };

    const finalEntries = entries.length > 0 ? entries : [fallbackEntry];

    return {
      intent: finalEntries[0].intent,
      amount: finalEntries[0].amount,
      currency: 'INR',
      merchant: finalEntries[0].merchant,
      category: finalEntries[0].category,
      payment_method: finalEntries[0].payment_method,
      transaction_type: finalEntries[0].transaction_type,
      description: transcript,
      date: null,
      person_name: finalEntries[0].person_name,
      target_category: null,
      raw_transcript: transcript,
      transactions: finalEntries,
      entries: finalEntries,
    };
  }

  public static localHeuristicReceiptParser(transcript: string): ExtractedReceiptResult {
    const rawItems = transcript.split(/,|\band\b/i);
    const items = rawItems
      .map((str) => {
        const numbers = str.match(/\d+([.,]\d+)?/g);
        if (!numbers) return null;

        const qty = parseFloat(numbers[0]);
        const price = numbers.length > 1 ? parseFloat(numbers[numbers.length - 1]) : 100;
        const nameClean = str.replace(/\d+/g, '').replace(/per kg|each|litres|litre|pieces|pcs|kg|rupees/gi, '').trim();

        let unit = 'pcs';
        if (str.includes('kg')) unit = 'kg';
        else if (str.includes('litre') || str.includes('litres') || str.includes('l ')) unit = 'litres';

        return {
          name: nameClean.length > 0 ? nameClean.charAt(0).toUpperCase() + nameClean.slice(1) : 'Item',
          quantity: qty,
          unit,
          unit_price: price,
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    return {
      intent: 'create_receipt',
      items: items.length > 0 ? items : [{ name: 'Sample Item', quantity: 1, unit: 'pcs', unit_price: 100 }],
      customer_name: null,
      customer_phone: null,
      customer_address: null,
      customer_gstin: null,
      discount: 0,
      tax: 0,
      tax_percent: 0,
      tax_type: 'none',
      currency: 'INR',
      raw_transcript: transcript,
    };
  }

  public static matchAllowedOption(rawValue: any, options: string[]): string | undefined {
    if (rawValue === undefined || rawValue === null || options.length === 0) return undefined;
    const str = String(rawValue).trim();
    if (!str) return undefined;
    const lower = str.toLowerCase();

    // 1. Exact match (case insensitive)
    const exact = options.find((opt) => opt.toLowerCase() === lower);
    if (exact) return exact;

    // 2. Look for whole word boundary match in raw value
    for (const opt of options) {
      const escaped = opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(str)) {
        return opt;
      }
    }

    // 3. Shift / common aliases
    if (options.includes('A') && /\b(shift\s*a|1st\s*shift|first\s*shift|morning\s*shift|shift\s*1)\b/i.test(str)) return 'A';
    if (options.includes('B') && /\b(shift\s*b|2nd\s*shift|second\s*shift|evening\s*shift|afternoon\s*shift|shift\s*2)\b/i.test(str)) return 'B';
    if (options.includes('C') && /\b(shift\s*c|3rd\s*shift|third\s*shift|night\s*shift|shift\s*3)\b/i.test(str)) return 'C';

    // 4. Substring containment
    const sub = options.find((opt) => lower.includes(opt.toLowerCase()) || opt.toLowerCase().includes(lower));
    if (sub) return sub;

    return undefined;
  }

  public static matchOptionFromTranscript(
    transcript: string,
    fieldName: string,
    extractionKey: string,
    options: string[]
  ): string | undefined {
    if (!transcript || options.length === 0) return undefined;
    const fLower = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const kLower = extractionKey.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Shift aliases
    if ((fLower.includes('shift') || kLower.includes('shift'))) {
      if (options.includes('A') && /\b(shift\s*a|1st\s*shift|first\s*shift|morning\s*shift|shift\s*1)\b/i.test(transcript)) return 'A';
      if (options.includes('B') && /\b(shift\s*b|2nd\s*shift|second\s*shift|evening\s*shift|afternoon\s*shift|shift\s*2)\b/i.test(transcript)) return 'B';
      if (options.includes('C') && /\b(shift\s*c|3rd\s*shift|third\s*shift|night\s*shift|shift\s*3)\b/i.test(transcript)) return 'C';
    }

    // Pattern: <fieldName|key> (is|:|no|code|was|-)? <option>
    for (const opt of options) {
      const escaped = opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const optRegex = new RegExp(`(?:${fieldName}|${extractionKey})\\s*(?:is|:|no|code|was|-|number)?\\s*\\b${escaped}\\b`, 'i');
      if (optRegex.test(transcript)) {
        return opt;
      }
    }

    // Pattern: <option> <fieldName|key> (e.g. "A shift" or "shift A")
    for (const opt of options) {
      const escaped = opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escaped}\\s*(?:${fieldName}|${extractionKey})\\b|\\b(?:${fieldName}|${extractionKey})\\s*${escaped}\\b`, 'i');
      if (pattern.test(transcript)) {
        return opt;
      }
    }

    // Standalone option with word boundary
    for (const opt of options) {
      if (opt.length > 1) {
        const escaped = opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const optRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (optRegex.test(transcript)) {
          return opt;
        }
      }
    }

    return undefined;
  }

  public static localHeuristicCustomDataParser(transcript: string, template: DataTemplate): ExtractedDataResult {
    const fieldValues: Record<string, any> = {};

    template.fields.forEach((f) => {
      if (f.options && f.options.length > 0) {
        const fromTranscript = GroqServer.matchOptionFromTranscript(transcript, f.name, f.extractionKey, f.options);
        if (fromTranscript) {
          fieldValues[f.extractionKey] = fromTranscript;
          return;
        }
      }

      const fieldLower = f.name.toLowerCase();
      const keyLower = f.extractionKey.toLowerCase();
      const regex = new RegExp(`(?:${fieldLower}|${keyLower})\\s*(?:is|:|number|no|code|was)?\\s*([a-zA-Z0-9-/:_.]+)`, 'i');
      const match = transcript.match(regex);
      if (match && match[1]) {
        let val: any = match[1].trim();
        if (f.options && f.options.length > 0) {
          const matchedOpt = GroqServer.matchAllowedOption(val, f.options);
          val = matchedOpt || val;
        } else if (f.type === 'number') {
          const num = parseFloat(val);
          val = isNaN(num) ? val : num;
        }
        fieldValues[f.extractionKey] = val;
      } else {
        fieldValues[f.extractionKey] = '';
      }
    });

    const tableRows: Array<Record<string, any>> = [];
    if (template.hasTable && template.tableFields.length > 0) {
      const initialRow: Record<string, any> = {};
      template.tableFields.forEach((c) => {
        initialRow[c.extractionKey] = '';
      });
      tableRows.push(initialRow);
    }

    // Normalize dates and apply Auto-Fill lookup
    const normalizedData = normalizeAndAutoFillTemplateData(fieldValues, tableRows, template);

    return {
      templateId: template.id,
      templateName: template.name,
      fieldValues: normalizedData.fieldValues,
      tableRows: normalizedData.tableRows,
      raw_transcript: transcript,
      lookupStatus: normalizedData.lookupStatus,
      invalidLookup: normalizedData.invalidLookup,
      invalidLookupMessage: normalizedData.invalidLookupMessage,
    };
  }

  public static localHeuristicFlexibleParser(transcript: string): FlexibleExtractedResult {
    const segments = transcript
      .split(/[,;\n]|\band\b/i)
      .map((s) => s.trim())
      .filter(Boolean);

    const fields: FlexibleField[] = [];

    segments.forEach((seg, idx) => {
      const match = seg.match(/^([a-zA-Z\s#]+?)(?:\s*(?:is|:|number|no|=|->)\s*|\s+)(\S.*)$/i);
      if (match && match[1] && match[2]) {
        const rawName = match[1].trim();
        let rawVal = match[2].trim();
        const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        if (isDateField(cleanName)) {
          rawVal = normalizeDateToDDMMYYYY(rawVal);
        }
        fields.push({
          id: `flex_field_${idx}_${Date.now()}`,
          name: cleanName,
          value: rawVal,
        });
      } else if (seg.length > 0) {
        fields.push({
          id: `flex_field_${idx}_${Date.now()}`,
          name: `Item ${idx + 1}`,
          value: seg,
        });
      }
    });

    if (fields.length === 0) {
      fields.push({
        id: `flex_field_0_${Date.now()}`,
        name: 'Spoken Content',
        value: transcript,
      });
    }

    return {
      isFlexible: true,
      title: 'Flexible Voice Entry',
      fields,
      table: null,
      raw_transcript: transcript,
    };
  }

  public static async editEntryByVoice(
    transcript: string,
    template: DataTemplate | null | undefined,
    currentValues: Record<string, any> = {},
    options?: {
      isFlexible?: boolean;
      flexibleFields?: FlexibleField[];
      customApiKey?: string | null;
    }
  ): Promise<{
    updatedFields: Record<string, any>;
    finalFieldValues: Record<string, any>;
    detectedFieldNames: string[];
    summary: string;
    lookupStatus?: 'valid' | 'invalid' | 'none';
    invalidLookup?: boolean;
    invalidLookupMessage?: string;
    rawTranscript?: string;
  }> {
    let fieldsPrompt = '';
    if (template && template.fields) {
      fieldsPrompt = template.fields
        .map((f) => `- ${f.name} (Key: "${f.extractionKey}", Type: ${f.type})`)
        .join('\n');
    } else if (options?.flexibleFields && options.flexibleFields.length > 0) {
      fieldsPrompt = options.flexibleFields
        .map((f) => `- ${f.name} (Current: "${f.value}")`)
        .join('\n');
    } else {
      fieldsPrompt = Object.entries(currentValues)
        .map(([k, v]) => `- ${k} (Current: "${v}")`)
        .join('\n');
    }

    const systemPrompt = `You are an intelligent entity modifier for an electronic production record (EPR) application.
The user is speaking a voice correction to modify one or more fields in an existing record.
Available Record Fields:
${fieldsPrompt}

Current Record Field Values:
${JSON.stringify(currentValues, null, 2)}

User Voice Correction Input:
"${transcript}"

TASK:
1. Identify which field(s) the user wants to update and the exact new value(s).
2. If the user mentions a field name or partial name (e.g. "Part No 341", "Change OK Quantity to 20", "Shift B", "28 August 2026"), match it with the closest extractionKey from the schema.
3. If a date field is modified, normalize the value into "DD-MM-YYYY" format (e.g. "28-08-2026").
4. Return ONLY valid JSON format:
{
  "updatedFields": { "<fieldKey>": <newValue> },
  "detectedFieldNames": ["<human readable field name>"],
  "summary": "<short description, e.g. Updated Part No to 341>"
}`;

    let result: any = null;

    try {
      result = await this.executeWithFailover<any>(
        'Voice Field Edit Extraction',
        options?.customApiKey,
        async (apiKey) => {
          const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: LLM_MODEL,
              messages: [{ role: 'user', content: systemPrompt }],
              temperature: 0.05,
              response_format: { type: 'json_object' },
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            const err: any = new Error(`Groq Voice Edit Error: ${errText}`);
            err.status = res.status;
            throw err;
          }

          const data = await res.json();
          const content = data.choices[0]?.message?.content || '{}';
          return cleanAndParseJson<any>(content);
        }
      );
    } catch (err) {
      console.warn('LLM voice edit failed, trying heuristic extraction:', err);
      // Heuristic fallback for simple voice edits
      const updatedFallback: Record<string, any> = {};
      const detectedNames: string[] = [];

      if (template?.fields) {
        for (const field of template.fields) {
          const nameRegex = new RegExp(`(?:${field.name}|${field.extractionKey})\\s*(?:is|to|=|:)?\\s*(\\S.*)`, 'i');
          const match = transcript.match(nameRegex);
          if (match && match[1]) {
            let val = match[1].trim();
            if (field.type === 'number') {
              const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
              if (!isNaN(num)) val = num as any;
            } else if (field.type === 'date' || isDateField(field.extractionKey)) {
              val = normalizeDateToDDMMYYYY(val);
            }
            updatedFallback[field.extractionKey] = val;
            detectedNames.push(field.name);
          }
        }
      }

      result = {
        updatedFields: updatedFallback,
        detectedFieldNames: detectedNames,
        summary: detectedNames.length > 0 ? `Updated ${detectedNames.join(', ')}` : 'Could not detect field to update',
      };
    }

    const updatedFields: Record<string, any> = result?.updatedFields || {};
    const detectedFieldNames: string[] = result?.detectedFieldNames || [];
    const summary: string = result?.summary || 'Updated fields';

    // Normalize dates in updated fields
    Object.keys(updatedFields).forEach((k) => {
      const fieldDef = template?.fields.find((f) => f.extractionKey === k || f.name.toLowerCase() === k.toLowerCase());
      if (fieldDef?.type === 'date' || isDateField(k) || (fieldDef && isDateField(fieldDef.name))) {
        updatedFields[k] = normalizeDateToDDMMYYYY(String(updatedFields[k]));
      }
    });

    // Merge updated fields onto existing values
    let finalFieldValues: Record<string, any> = {
      ...currentValues,
      ...updatedFields,
    };

    let lookupStatus: 'valid' | 'invalid' | 'none' = 'none';
    let invalidLookup = false;
    let invalidLookupMessage: string | undefined;

    // If template has autofill and any updated field is the baseFieldKey, recalculate autofill!
    if (template) {
      const normalized = normalizeAndAutoFillTemplateData(finalFieldValues, [], template);
      finalFieldValues = normalized.fieldValues;
      lookupStatus = normalized.lookupStatus;
      invalidLookup = normalized.invalidLookup;
      invalidLookupMessage = normalized.invalidLookupMessage;
    }

    return {
      updatedFields,
      finalFieldValues,
      detectedFieldNames,
      summary,
      lookupStatus,
      invalidLookup,
      invalidLookupMessage,
      rawTranscript: transcript,
    };
  }

  /**
   * Extract Doctor's Prescription from voice transcript or clinical text
   */
  public static async extractDoctorPrescription(
    transcript: string,
    customKey?: string | null
  ): Promise<ExtractedPrescriptionResult> {
    const keys = await this.getAllKeys(customKey);
    if (keys.length === 0) {
      return this.localHeuristicPrescriptionParser(transcript);
    }

    const systemPrompt = `You are an expert Medical AI Entity Extractor & Doctor's Prescription Assistant.
The input provided to you is a Doctor's Prescription / Medical Prescription (spoken dictation, consultation notes, or prescription summary).

Extract patient details, doctor & clinic information, clinical diagnosis/notes, and ALL prescribed medicines into a valid JSON object.

TOP-LEVEL FIELDS:
- "patient_name": Patient's full name (e.g. "John Doe", "Ananya Sharma")
- "age": Patient's age (e.g. "34", "29", "45 Yrs")
- "gender": Gender if mentioned ("Male", "Female", "Other", or null)
- "phone": 10-15 digit phone number (e.g. "+91 9876543210")
- "email": Email address (e.g. "patient@example.com")
- "date": Date of prescription formatted strictly as DD-MM-YYYY (e.g. "02-09-2026"). If not mentioned, use today's date.
- "doctor_name": Doctor's full name & degrees (e.g. "Dr. Sarah Jenkins, MD")
- "doctor_specialty": Doctor specialty (e.g. "Senior Consultant Physician")
- "clinic_details": Clinic/Hospital name, address, or details (e.g. "City Care Health Clinic")
- "diagnosis": Clinical diagnosis, symptoms, or chief complaint (e.g. "Acute Upper Respiratory Tract Infection")
- "notes": Doctor advice, precautions, follow-up instructions, diet advice (e.g. "Drink warm water, take rest, review in 5 days")

MEDICINES TABLE ("medicines" array):
For EVERY medicine mentioned or implied in the prescription, create an object with:
- "name": Medicine brand/generic name and formulation (e.g. "Augmentin 625 Duo Tablet", "Paracetamol 650mg", "Pan-D Capsule")
- "dosage": Dosage strength or quantity per dose (e.g. "625 mg", "1 Tablet", "10 ml", "1 Capsule")
- "timing": Must be "AF" (After Food / After Meals) or "BF" (Before Food / Empty Stomach). (If antacid/PPI like Pantoprazole/Omeprazole -> "BF"; for analgesics/antibiotics -> "AF")
- "frequency": Dosing frequency (e.g. "1-0-1", "1-1-1", "1-0-0", "0-0-1", "Twice daily", "Once daily", "SOS / As needed")
- "duration": Duration of treatment (e.g. "5 days", "3 days", "1 week", "10 days")
- "instructions": Specific instructions if mentioned (e.g. "Take with warm water after dinner")

STRICT RAW JSON FORMAT:
Return ONLY a valid raw JSON object matching:
{
  "patient_name": "...",
  "age": "...",
  "gender": "...",
  "phone": "...",
  "email": "...",
  "date": "DD-MM-YYYY",
  "doctor_name": "...",
  "doctor_specialty": "...",
  "clinic_details": "...",
  "diagnosis": "...",
  "notes": "...",
  "medicines": [
    {
      "name": "Augmentin 625 Duo",
      "dosage": "625 mg",
      "timing": "AF",
      "frequency": "1-0-1",
      "duration": "5 days",
      "instructions": "After breakfast and dinner"
    }
  ]
}`;

    try {
      return await this.executeWithFailover('Doctor Prescription Extraction', customKey, async (apiKey) => {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Prescription Content:\n"${transcript}"` },
            ],
            temperature: 0.1,
            reasoning_effort: 'none',
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (this.isFailoverEligibleError(response.status, errorText)) {
            const err = new Error(`Rate limit or API error hit (Status ${response.status}): ${errorText}`);
            (err as any).status = response.status;
            (err as any).errorText = errorText;
            throw err;
          }
          return this.localHeuristicPrescriptionParser(transcript);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (!content) return this.localHeuristicPrescriptionParser(transcript);

        const parsed = cleanAndParseJson<ExtractedPrescriptionResult>(content);
        parsed.raw_transcript = transcript;

        // Ensure date is formatted properly
        if (parsed.date) {
          parsed.date = normalizeDateToDDMMYYYY(parsed.date);
        } else {
          parsed.date = getTodayString();
        }

        // Clean & validate medicines list
        if (!Array.isArray(parsed.medicines) || parsed.medicines.length === 0) {
          parsed.medicines = [];
        } else {
          parsed.medicines = parsed.medicines.map((m: any) => ({
            name: m.name || m.medicine_name || 'Prescribed Medicine',
            dosage: m.dosage || m.dose || '1 dose',
            timing: (m.timing && String(m.timing).toUpperCase().includes('BF')) ? 'BF' : 'AF',
            frequency: m.frequency || m.instructions || '1-0-1',
            duration: m.duration || '5 days',
            instructions: m.instructions || (m.timing === 'BF' ? 'Before food' : 'After food'),
          }));
        }

        return parsed;
      });
    } catch (e: any) {
      console.warn('Falling back to local heuristic prescription parser:', e.message);
      return this.localHeuristicPrescriptionParser(transcript);
    }
  }

  /**
   * Local heuristic fallback parser for Doctor Prescriptions
   */
  private static localHeuristicPrescriptionParser(transcript: string): ExtractedPrescriptionResult {
    const text = transcript;
    const lower = text.toLowerCase();

    // 1. Patient Name
    let patientName: string | null = null;
    const nameMatch = text.match(/(?:patient(?:\s+name)?|mr\.|mrs\.|ms\.|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (nameMatch) {
      let rawName = nameMatch[1].trim();
      rawName = rawName.replace(/\s+(?:aged?|years?|phone|email|suffering|is)\b.*$/i, '').trim();
      patientName = rawName || null;
    }

    // 2. Age
    let age: string | null = null;
    const ageMatch = text.match(/(?:age|aged|years old|yrs old|yr old)\s*(?:is|:)?\s*(\d{1,3})/i) ||
      text.match(/(\d{1,3})\s*(?:years|yrs|yo|year old|years old)/i);
    if (ageMatch) {
      age = `${ageMatch[1]} Yrs`;
    }

    // 3. Gender
    let gender: string | null = null;
    if (/\b(?:female|woman|girl)\b/i.test(text)) gender = 'Female';
    else if (/\b(?:male|man|boy)\b/i.test(text)) gender = 'Male';

    // 4. Phone
    let phone: string | null = null;
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
    if (phoneMatch) {
      phone = phoneMatch[0].trim();
    }

    // 5. Email
    let email: string | null = null;
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      email = emailMatch[0].trim();
    }

    // 6. Doctor Name
    let doctorName: string | null = null;
    const docMatch = text.match(/(?:doctor|dr\.)\s+(?:dr\.\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (docMatch) {
      const docClean = docMatch[1].trim().replace(/^dr\.?\s+/i, '');
      doctorName = `Dr. ${docClean}`;
    }

    // 7. Clinic / Hospital Details
    let clinicDetails: string | null = null;
    const clinicMatch = text.match(/(?:at|clinic|hospital|center)\s+([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Care|Healthcare|Center|Polyclinic))/i);
    if (clinicMatch) {
      clinicDetails = clinicMatch[0].trim().replace(/^(?:at|in)\s+/i, '');
    }

    // 8. Diagnosis
    let diagnosis: string | null = null;
    const diagMatch = text.match(/(?:diagnosis|diagnosed with|suffering from|complaint of|chief complaint)\s*:?\s*([^,.;]+)/i);
    if (diagMatch) {
      diagnosis = diagMatch[1].trim();
    }

    // 9. Medicines detection (split by medicine markers, commas, or "and")
    const medicines: Array<{
      name: string;
      dosage: string;
      timing: string;
      frequency: string;
      duration: string;
      instructions: string;
    }> = [];

    const commonMeds = [
      'paracetamol', 'dolo', 'augmentin', 'amoxicillin', 'azithromycin', 'pantoprazole', 'pan-d', 'pan d',
      'ascoril', 'cetirizine', 'allegra', 'montair-lc', 'ibuprofen', 'combiflam', 'metformin', 'telmisartan',
      'atorvastatin', 'ciprofloxacin', 'calpol', 'crocin', 'omeprazole', 'rabeprazole', 'gelusil', 'digene'
    ];

    commonMeds.forEach((med) => {
      const regex = new RegExp(`\\b(${med}[\\w\\s\\d-]*?)(?:\\s+(?:tablet|capsule|syrup|mg|ml))?\\b`, 'i');
      const match = text.match(regex);
      if (match) {
        const medName = match[0].trim();
        const isBF = /before (?:food|meals?|breakfast)|empty stomach/i.test(text) && med.includes('pan');
        medicines.push({
          name: medName.charAt(0).toUpperCase() + medName.slice(1),
          dosage: '1 Tablet / 500mg',
          timing: isBF ? 'BF' : 'AF',
          frequency: '1-0-1',
          duration: '5 days',
          instructions: isBF ? 'Before food empty stomach' : 'After meals with water',
        });
      }
    });

    if (medicines.length === 0) {
      medicines.push({
        name: 'Paracetamol 650mg',
        dosage: '650 mg',
        timing: 'AF',
        frequency: '1-0-1',
        duration: '5 days',
        instructions: 'After food',
      });
    }

    return {
      patient_name: patientName,
      age: age,
      gender: gender,
      phone: phone,
      email: email,
      date: getTodayString(),
      doctor_name: doctorName,
      clinic_details: clinicDetails,
      diagnosis: diagnosis,
      notes: 'Drink plenty of water and complete the prescribed dosage.',
      medicines,
      raw_transcript: transcript,
    };
  }
}
