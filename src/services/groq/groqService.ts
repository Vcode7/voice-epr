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
import { ApiClient } from '../api/apiClient';

export interface KeyStatusInfo {
  hasEnvKey: boolean;
  hasCustomKey: boolean;
  isConfigured: boolean;
  activeKeyType: 'primary_env' | 'backup_custom' | 'none';
}

export class GroqService {
  public static async getKeyStatus(): Promise<KeyStatusInfo> {
    try {
      const status = await ApiClient.getKeyStatus();
      return {
        hasEnvKey: status.hasEnvKey,
        hasCustomKey: status.hasCustomKey,
        isConfigured: status.isConfigured,
        activeKeyType: (status.activeKeyType as any) || 'none',
      };
    } catch {
      return {
        hasEnvKey: false,
        hasCustomKey: false,
        isConfigured: true,
        activeKeyType: 'primary_env',
      };
    }
  }

  public static async isConfigured(): Promise<boolean> {
    const status = await this.getKeyStatus();
    return status.isConfigured;
  }

  /**
   * Transcribe Audio file URI using Next.js Groq Whisper API
   */
  public static async transcribeAudio(audioUri: string): Promise<string> {
    try {
      console.log('🎤 [Mobile STT Request] Forwarding audio to Next.js API:', audioUri);
      return await ApiClient.transcribeAudio(audioUri);
    } catch (e: any) {
      console.error('❌ [Mobile STT API Error]:', e.message);
      throw e;
    }
  }

  /**
   * Extract financial intent from transcript via Next.js Groq LLM API
   */
  public static async extractFinancialIntent(transcript: string): Promise<ExtractedIntentResult> {
    try {
      console.log('📥 [Mobile LLM Intent Request] Forwarding transcript to Next.js API:', `"${transcript}"`);
      return await ApiClient.extractFinancialIntent(transcript);
    } catch (e: any) {
      console.warn('⚠️ [Mobile LLM Intent API Fallback]: Falling back to local heuristic parser...', e.message);
      return this.localHeuristicIntentParser(transcript);
    }
  }

  /**
   * Extract Voice Receipt line items from transcript via Next.js Groq API
   */
  public static async extractVoiceReceipt(transcript: string): Promise<ExtractedReceiptResult> {
    try {
      console.log('🧾 [Mobile Voice Receipt Request] Forwarding to Next.js API:', `"${transcript}"`);
      return await ApiClient.extractVoiceReceipt(transcript);
    } catch (e: any) {
      console.warn('⚠️ [Mobile Voice Receipt API Fallback]: Falling back to local heuristic parser...', e.message);
      return this.localHeuristicReceiptParser(transcript);
    }
  }

  /**
   * Parse financial queries for Ask Finance mode via Next.js Groq API
   */
  public static async parseFinancialQuery(transcript: string): Promise<FinancialQueryResult> {
    try {
      console.log('🔍 [Mobile Financial Query Request] Forwarding to Next.js API:', `"${transcript}"`);
      return await ApiClient.parseFinancialQuery(transcript);
    } catch (e: any) {
      console.warn('⚠️ [Mobile Financial Query API Fallback]:', e.message);
      return { queryType: 'general' };
    }
  }

  /**
   * Extract custom template data & repeated table rows via Next.js Groq API
   */
  public static async extractCustomData(transcript: string, template: DataTemplate): Promise<ExtractedDataResult> {
    try {
      console.log(`📋 [Mobile Custom Data Request] Forwarding to Next.js API: "${template.name}"`);
      return await ApiClient.extractCustomData(transcript, template);
    } catch (e: any) {
      console.warn('⚠️ [Mobile Custom Data API Fallback]: Falling back to local heuristic parser...', e.message);
      return this.localHeuristicCustomDataParser(transcript, template);
    }
  }

  /**
   * Autonomous Flexible Voice Extraction via Next.js Groq API
   */
  public static async extractFlexibleData(transcript: string): Promise<FlexibleExtractedResult> {
    try {
      console.log(`✨ [Mobile Flexible Extraction Request] Forwarding to Next.js API: "${transcript}"`);
      return await ApiClient.extractFlexibleData(transcript);
    } catch (e: any) {
      console.warn('⚠️ [Mobile Flexible API Fallback]: Falling back to local heuristic parser...', e.message);
      return this.localHeuristicFlexibleParser(transcript);
    }
  }

  // --- Fallback Regex & Heuristic Parsers (for offline resilience) ---

  public static localHeuristicIntentParser(transcript: string): ExtractedIntentResult {
    console.log('🛠️ [Local Heuristic Parser Input] Transcript:', `"${transcript}"`);

    const numbers = transcript.match(/\d+([.,]\d+)?/g);
    const chunks = (numbers && numbers.length > 1)
      ? transcript.split(/\b(?:and|also|plus|,|then|bought|spent|paid)\b/i)
      : [transcript];

    const entries = chunks.map((chunk) => {
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
    }).filter((e) => e.amount !== null || e.merchant !== null);

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
