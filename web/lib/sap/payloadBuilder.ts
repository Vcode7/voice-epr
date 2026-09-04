import { DataEntryRecord } from '@/types';
import { SapFieldMapping, SapEntitySet, SapField } from '@/types/sap';
import { SapPayloadPreviewResult } from './types';

export class PayloadBuilder {
  /**
   * Build and validate an SAP OData JSON payload for a single DataEntryRecord based on the configured mapping.
   */
  public static buildPayload(
    record: DataEntryRecord,
    mapping: SapFieldMapping,
    entitySet?: SapEntitySet
  ): {
    payload: Record<string, any>;
    isValid: boolean;
    missingRequired: string[];
    warnings: string[];
  } {
    const payload: Record<string, any> = {};
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    // 1. Apply mapped template fields
    for (const rule of mapping.mappings) {
      if (!rule.sapFieldName || rule.sapFieldName.trim() === '') continue;

      let rawValue = record.fieldValues?.[rule.templateFieldKey];

      // Check if flexible field
      if (rawValue === undefined && record.flexibleFields) {
        const flexMatch = record.flexibleFields.find(
          (f) => f.name.toLowerCase() === rule.templateFieldName.toLowerCase()
        );
        if (flexMatch) rawValue = flexMatch.value;
      }

      // Check default/static value fallback
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        rawValue = rule.defaultValue ?? '';
      }

      // Format and cast according to transformation and SAP field type
      const castValue = this.castValue(rawValue, rule.sapFieldType, rule.transformation);
      payload[rule.sapFieldName] = castValue;
    }

    // 2. Apply static constant values configured for the entity set (e.g., CompanyCode = '1000', Plant = '1010')
    if (mapping.staticValues) {
      for (const [sapKey, staticVal] of Object.entries(mapping.staticValues)) {
        if (staticVal !== undefined && staticVal !== null && staticVal !== '') {
          payload[sapKey] = staticVal;
        }
      }
    }

    // 3. Validate against EntitySet definition if available
    if (entitySet) {
      for (const sf of entitySet.fields) {
        const isMappedOrStatic = payload[sf.name] !== undefined && payload[sf.name] !== null && payload[sf.name] !== '';

        if (!sf.nullable && !isMappedOrStatic) {
          // If it's a generated key (like auto-increment ID or counter), note it, else mark missing
          missingRequired.push(`${sf.name} (${sf.label || sf.type})`);
        }

        // Type range and length validation
        if (payload[sf.name] !== undefined && payload[sf.name] !== null) {
          const val = payload[sf.name];
          if (sf.maxLength && typeof val === 'string' && val.length > sf.maxLength) {
            warnings.push(`Field '${sf.name}' length (${val.length}) exceeds SAP maximum length (${sf.maxLength}). It will be truncated.`);
            payload[sf.name] = val.substring(0, sf.maxLength);
          }
        }
      }
    }

    const isValid = missingRequired.length === 0;

    return {
      payload,
      isValid,
      missingRequired,
      warnings,
    };
  }

  /**
   * Generates a preview object for UI display and validation prior to upload.
   */
  public static generatePreview(
    record: DataEntryRecord,
    mapping: SapFieldMapping,
    entitySet?: SapEntitySet
  ): SapPayloadPreviewResult {
    const { payload, isValid, missingRequired, warnings } = this.buildPayload(record, mapping, entitySet);

    return {
      recordId: record.id,
      templateName: record.templateName || 'Data Record',
      entitySetName: mapping.entitySetName,
      payload,
      valid: isValid,
      missingRequiredFields: missingRequired,
      typeWarnings: warnings,
      isAlreadyUploaded: record.sapUploadStatus === 'uploaded',
      previousUploadDocId: record.sapDocumentNumber,
      previousUploadTime: record.sapLastUpload,
    };
  }

  /**
   * Casts and formats a raw Voice Entry value into the appropriate SAP OData type.
   */
  private static castValue(val: any, sapType: string, transform?: string): any {
    if (val === undefined || val === null || val === '') {
      if (sapType.includes('String')) return '';
      if (sapType.includes('Int') || sapType.includes('Decimal')) return 0;
      if (sapType.includes('Boolean')) return false;
      return null;
    }

    let stringVal = String(val).trim();

    // Apply basic transformations
    if (transform === 'uppercase') stringVal = stringVal.toUpperCase();
    if (transform === 'lowercase') stringVal = stringVal.toLowerCase();
    if (transform === 'trim') stringVal = stringVal.trim();

    const sType = sapType.toLowerCase();

    // 1. String
    if (sType.includes('string')) {
      return stringVal;
    }

    // 2. Integers (Edm.Int16, Edm.Int32, Edm.Int64, Edm.Byte)
    if (sType.includes('int') || sType.includes('byte')) {
      const num = parseInt(stringVal.replace(/[^0-9\-]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    }

    // 3. Decimals, Floats, Doubles (Edm.Decimal, Edm.Double, Edm.Single)
    if (sType.includes('decimal') || sType.includes('double') || sType.includes('single')) {
      const num = parseFloat(stringVal.replace(/[^0-9\.\-]/g, ''));
      return isNaN(num) ? 0.0 : num;
    }

    // 4. Boolean (Edm.Boolean)
    if (sType.includes('boolean')) {
      const lower = stringVal.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'x';
    }

    // 5. DateTime (Edm.DateTime, Edm.DateTimeOffset)
    if (sType.includes('datetime')) {
      if (transform === 'date_sap') {
        // SAP OData v2 JSON format: /Date(1620000000000)/
        const d = new Date(stringVal);
        const timestamp = isNaN(d.getTime()) ? Date.now() : d.getTime();
        return `/Date(${timestamp})/`;
      } else {
        // ISO 8601 string: 2026-09-03T00:00:00
        const d = new Date(stringVal);
        if (isNaN(d.getTime())) {
          return new Date().toISOString().split('.')[0];
        }
        return d.toISOString().split('.')[0];
      }
    }

    return stringVal;
  }
}
