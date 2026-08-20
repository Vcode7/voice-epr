import {
  ExtractedIntentResult,
  ExtractedReceiptResult,
  FinancialQueryResult,
  DataTemplate,
  ExtractedDataResult,
  FlexibleExtractedResult,
  FlexibleField,
  FlexibleTable,
} from '../../types';
import { dbSettings } from '../db/models';

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
      if (trimmed !== '' && !trimmed.includes('your_groq_api_key') && !seen.has(trimmed)) {
        seen.add(trimmed);
        keys.push({ key: trimmed, label });
      }
    };

    addKey(process.env.GROQ_API_KEY, 'Base Primary .env Key');
    addKey(process.env.GROQ_API_KEY_FALLBACK1, '.env Fallback Key #1');
    addKey(process.env.GROQ_API_KEY_FALLBACK2, '.env Fallback Key #2');
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
    };
  }

  private static isRateLimitError(status: number, errorText: string = ''): boolean {
    if (status === 429) return true;
    const lower = errorText.toLowerCase();
    return lower.includes('rate_limit') || lower.includes('429') || lower.includes('rate limit');
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
        const isRateLimit =
          error?.status === 429 ||
          (error?.message && (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')));

        const isAuthError =
          error?.status === 401 ||
          (error?.message && (error.message.includes('401') || error.message.toLowerCase().includes('invalid api key')));

        if (isRateLimit || isAuthError) {
          if (i < keys.length - 1) {
            console.warn(`⚠️ [Groq Server] ${label} (${isRateLimit ? 'Rate limit hit' : 'Auth failure'}) during ${operationName}. Failing over to next key (${keys[i + 1].label})...`);
            continue;
          } else {
            console.error(`❌ [Groq Server] All ${keys.length} Groq API keys hit rate limit or failed during ${operationName}.`);
            throw new Error(`Rate limit hit on all configured Groq keys! (Tried ${keys.length} keys). Add another key in Settings.`);
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
        if (this.isRateLimitError(response.status, errorText)) {
          const err = new Error(`Rate limit hit (Status ${response.status})`);
          (err as any).status = response.status;
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
          if (this.isRateLimitError(response.status, errorText)) {
            const err = new Error(`Rate limit hit (Status ${response.status})`);
            (err as any).status = response.status;
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
          if (this.isRateLimitError(response.status, errorText)) {
            const err = new Error(`Rate limit hit (Status ${response.status})`);
            (err as any).status = response.status;
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

    const fieldDescriptions = template.fields
      .map((f) => `- "${f.extractionKey}" (${f.name}, type: ${f.type}${f.placeholder ? `, e.g. ${f.placeholder}` : ''})`)
      .join('\n');

    let tableSection = '';
    if (template.hasTable && template.tableFields && template.tableFields.length > 0) {
      const colDescriptions = template.tableFields
        .map((c) => `  * "${c.extractionKey}" (${c.name}, type: ${c.type}${c.placeholder ? `, e.g. ${c.placeholder}` : ''})`)
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
3. Date fields: Format as YYYY-MM-DD if mentioned, or null.
4. Time fields: Format as standard time (e.g. "08:30 AM") if mentioned.
5. Repeated Entries Table: Extract multi-row intervals or batches into "tableRows".
6. Never invent facts not spoken by the user.`;

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
          if (this.isRateLimitError(response.status, errorText)) {
            const err = new Error(`Rate limit hit (Status ${response.status})`);
            (err as any).status = response.status;
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
        });

        const tableRows = Array.isArray(parsed.tableRows)
          ? parsed.tableRows
          : Array.isArray(parsed.rows)
          ? parsed.rows
          : [];

        return {
          templateId: template.id,
          templateName: template.name,
          fieldValues,
          tableRows,
          raw_transcript: transcript,
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
          if (this.isRateLimitError(response.status, errorText)) {
            const err = new Error(`Rate limit hit (Status ${response.status})`);
            (err as any).status = response.status;
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
        const normalizedFields: FlexibleField[] = rawFields.map((f, idx) => ({
          id: `flex_field_${idx}_${Date.now()}`,
          name: f.name || `Field ${idx + 1}`,
          value: f.value !== null && f.value !== undefined ? f.value : '',
        }));

        if (normalizedFields.length === 0 && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v], idx) => {
            if (k !== 'title' && k !== 'table' && k !== 'fields' && typeof v !== 'object') {
              const formattedName = k
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
              normalizedFields.push({
                id: `flex_field_${idx}_${Date.now()}`,
                name: formattedName,
                value: String(v),
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
                return r.map((c) => (c !== null && c !== undefined ? String(c) : ''));
              } else if (typeof r === 'object' && r !== null) {
                return headers.map((h) => (r[h] !== undefined ? String(r[h]) : ''));
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

  public static localHeuristicCustomDataParser(transcript: string, template: DataTemplate): ExtractedDataResult {
    const fieldValues: Record<string, any> = {};

    template.fields.forEach((f) => {
      const fieldLower = f.name.toLowerCase();
      const keyLower = f.extractionKey.toLowerCase();
      const regex = new RegExp(`(?:${fieldLower}|${keyLower})\\s*(?:is|:|number|no|code|was)?\\s*([a-zA-Z0-9-/:_.]+)`, 'i');
      const match = transcript.match(regex);
      if (match && match[1]) {
        let val: any = match[1].trim();
        if (f.type === 'number') {
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

    return {
      templateId: template.id,
      templateName: template.name,
      fieldValues,
      tableRows,
      raw_transcript: transcript,
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
        const rawVal = match[2].trim();
        const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
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
}
