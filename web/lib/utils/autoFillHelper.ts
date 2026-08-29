import { DataTemplate, TemplateField, TemplateAutoFillConfig, AutoFillMappingEntry } from '@/types';
import { normalizeDateToDDMMYYYY, isDateField } from './dateUtils';

export interface AutoFillCsvParseResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  mappings: Record<string, Record<string, any>>;
  manualEntries: AutoFillMappingEntry[];
  rowCount: number;
}

export const normalizeLookupKey = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
};

/**
 * Robust CSV Line Parser supporting quoted strings, commas within quotes, and escaped quotes.
 */
export const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

/**
 * Finds matching template field for a CSV header name.
 */
export const matchFieldByHeader = (
  header: string,
  fields: TemplateField[]
): TemplateField | undefined => {
  const cleanHeader = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return fields.find((f) => {
    const cleanName = f.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanKey = f.extractionKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanHeader === cleanName || cleanHeader === cleanKey;
  });
};

/**
 * Parses and validates CSV content for Auto-Fill mappings.
 */
export const parseAutoFillCsv = (
  csvText: string,
  baseFieldKey: string,
  targetFieldKeys: string[],
  fields: TemplateField[]
): AutoFillCsvParseResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mappings: Record<string, Record<string, any>> = {};
  const manualEntries: AutoFillMappingEntry[] = [];

  if (!csvText || !csvText.trim()) {
    errors.push('CSV data is empty. Please upload a CSV file or enter data.');
    return { isValid: false, errors, warnings, mappings, manualEntries, rowCount: 0 };
  }

  if (!baseFieldKey) {
    errors.push('Please select a Base Field before parsing lookup data.');
    return { isValid: false, errors, warnings, mappings, manualEntries, rowCount: 0 };
  }

  if (!targetFieldKeys || targetFieldKeys.length === 0) {
    errors.push('Please select at least one Auto-Fill Field.');
    return { isValid: false, errors, warnings, mappings, manualEntries, rowCount: 0 };
  }

  const baseField = fields.find((f) => f.extractionKey === baseFieldKey);
  const targetFields = fields.filter((f) => targetFieldKeys.includes(f.extractionKey));

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('---') && !l.startsWith('#'));

  if (lines.length < 2) {
    errors.push('CSV must contain a header row and at least one data row.');
    return { isValid: false, errors, warnings, mappings, manualEntries, rowCount: 0 };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  if (rawHeaders.length === 0) {
    errors.push('Unable to parse CSV headers.');
    return { isValid: false, errors, warnings, mappings, manualEntries, rowCount: 0 };
  }

  // Map header index to field extractionKey
  let baseHeaderIndex = -1;
  const targetHeaderIndices: Record<string, number> = {};

  rawHeaders.forEach((h, idx) => {
    const matched = matchFieldByHeader(h, fields);
    if (matched) {
      if (matched.extractionKey === baseFieldKey) {
        baseHeaderIndex = idx;
      }
      if (targetFieldKeys.includes(matched.extractionKey)) {
        targetHeaderIndices[matched.extractionKey] = idx;
      }
    }
  });

  // Check if base field column was found
  if (baseHeaderIndex === -1) {
    const expectedLabel = baseField ? `"${baseField.name}" (${baseField.extractionKey})` : baseFieldKey;
    errors.push(`Missing column for Base Field: ${expectedLabel}. Please include this header in your CSV.`);
  }

  // Check if target fields columns were found
  const missingTargets: string[] = [];
  targetFields.forEach((tf) => {
    if (targetHeaderIndices[tf.extractionKey] === undefined) {
      missingTargets.push(`"${tf.name}" (${tf.extractionKey})`);
    }
  });

  if (missingTargets.length > 0) {
    errors.push(`Missing columns for Auto-Fill Fields: ${missingTargets.join(', ')}.`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings, mappings, manualEntries, rowCount: 0 };
  }

  const seenBaseKeys = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCsvLine(lines[i]);
    const rawBaseVal = rowValues[baseHeaderIndex]?.trim();

    if (!rawBaseVal) {
      warnings.push(`Row ${i + 1} skipped: Empty base field value.`);
      continue;
    }

    const normKey = normalizeLookupKey(rawBaseVal);

    if (seenBaseKeys.has(normKey)) {
      errors.push(`Duplicate base-field value found: "${rawBaseVal}" at row ${i + 1}. Base field values must be unique.`);
    } else {
      seenBaseKeys.add(normKey);
    }

    const rowTargetValues: Record<string, any> = {};
    const manualValues: Record<string, string> = {};

    targetFields.forEach((tf) => {
      const colIdx = targetHeaderIndices[tf.extractionKey];
      const rawCellVal = colIdx !== undefined ? rowValues[colIdx] ?? '' : '';

      // Type cast number/boolean if needed
      let formattedVal: any = rawCellVal;
      if (tf.type === 'number') {
        const parsedNum = parseFloat(rawCellVal);
        formattedVal = !isNaN(parsedNum) ? parsedNum : rawCellVal;
      } else if (tf.type === 'boolean') {
        formattedVal = ['true', 'yes', '1', 'y'].includes(String(rawCellVal).toLowerCase());
      }

      rowTargetValues[tf.extractionKey] = formattedVal;
      manualValues[tf.extractionKey] = String(rawCellVal);
    });

    mappings[normKey] = rowTargetValues;
    manualEntries.push({
      baseValue: rawBaseVal,
      values: manualValues,
    });
  }

  const rowCount = Object.keys(mappings).length;

  if (rowCount === 0 && errors.length === 0) {
    errors.push('No valid data rows found in the CSV.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mappings,
    manualEntries,
    rowCount,
  };
};

/**
 * Validates manual mapping entries and builds normalized mappings.
 */
export const buildMappingsFromManualEntries = (
  entries: AutoFillMappingEntry[],
  baseFieldKey: string,
  targetFieldKeys: string[]
): AutoFillCsvParseResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mappings: Record<string, Record<string, any>> = {};

  if (!baseFieldKey) {
    errors.push('Base field is required.');
    return { isValid: false, errors, warnings, mappings, manualEntries: entries, rowCount: 0 };
  }

  if (!targetFieldKeys || targetFieldKeys.length === 0) {
    errors.push('At least one auto-fill field must be selected.');
    return { isValid: false, errors, warnings, mappings, manualEntries: entries, rowCount: 0 };
  }

  if (!entries || entries.length === 0) {
    errors.push('No mapping rows provided. Click "Add Row" to add entries.');
    return { isValid: false, errors, warnings, mappings, manualEntries: entries, rowCount: 0 };
  }

  const seen = new Set<string>();

  entries.forEach((entry, idx) => {
    const rawBase = (entry.baseValue || '').trim();
    if (!rawBase) {
      errors.push(`Row ${idx + 1}: Base field value cannot be empty.`);
      return;
    }

    const normKey = normalizeLookupKey(rawBase);
    if (seen.has(normKey)) {
      errors.push(`Duplicate base value "${rawBase}" at row ${idx + 1}. Each base value must be unique.`);
    } else {
      seen.add(normKey);
    }

    const targetVals: Record<string, any> = {};
    targetFieldKeys.forEach((key) => {
      targetVals[key] = entry.values[key] ?? '';
    });

    mappings[normKey] = targetVals;
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mappings,
    manualEntries: entries,
    rowCount: Object.keys(mappings).length,
  };
};

/**
 * Validates complete template Auto-Fill configuration.
 */
export const validateAutoFillConfig = (
  config: TemplateAutoFillConfig | undefined,
  fields: TemplateField[]
): { isValid: boolean; errors: string[] } => {
  if (!config || !config.enabled) return { isValid: true, errors: [] };

  const errors: string[] = [];

  if (!config.baseFieldKey) {
    errors.push('Auto-Fill is enabled but no Base Field is selected.');
  }

  if (!config.targetFieldKeys || config.targetFieldKeys.length === 0) {
    errors.push('Auto-Fill is enabled but no Auto-Fill Target Fields are selected.');
  }

  if (config.targetFieldKeys?.includes(config.baseFieldKey)) {
    errors.push('Base Field cannot also be an Auto-Fill Target Field.');
  }

  const mappingKeys = Object.keys(config.mappings || {});
  if (mappingKeys.length === 0) {
    errors.push('Auto-Fill has no lookup data rows configured. Please upload a CSV or add manual mapping rows.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Finds matching lookup values for a given base value in a template.
 */
export const findAutoFillMatch = (
  baseValue: any,
  template: DataTemplate
): { matchFound: boolean; matchedValues?: Record<string, any>; normalizedKey: string } => {
  if (!template?.autoFill?.enabled || !template.autoFill.mappings) {
    return { matchFound: false, normalizedKey: '' };
  }

  const normKey = normalizeLookupKey(baseValue);
  if (!normKey) {
    return { matchFound: false, normalizedKey: '' };
  }

  const match = template.autoFill.mappings[normKey];
  if (match) {
    return { matchFound: true, matchedValues: match, normalizedKey: normKey };
  }

  return { matchFound: false, normalizedKey: normKey };
};

/**
 * Applies auto-fill mappings to an existing fieldValues dictionary.
 * Takes the extracted base field value, looks it up in the lookup table,
 * overrides target fields with lookup values, and flags invalid lookups.
 */
export const applyAutoFill = (
  fieldValues: Record<string, any>,
  template: DataTemplate
): {
  updatedValues: Record<string, any>;
  matchFound: boolean;
  matchedValues?: Record<string, any>;
  baseValue?: any;
  targetKeysFilled: string[];
  lookupStatus: 'valid' | 'invalid' | 'none';
  invalidLookup: boolean;
  invalidLookupMessage?: string;
} => {
  if (!template?.autoFill?.enabled || !template.autoFill.baseFieldKey) {
    return {
      updatedValues: { ...fieldValues },
      matchFound: false,
      targetKeysFilled: [],
      lookupStatus: 'none',
      invalidLookup: false,
    };
  }

  const baseKey = template.autoFill.baseFieldKey;
  const baseField = template.fields.find((f) => f.extractionKey === baseKey);
  const baseValue = fieldValues[baseKey];

  if (baseValue === undefined || baseValue === null || String(baseValue).trim() === '') {
    return {
      updatedValues: { ...fieldValues },
      matchFound: false,
      baseValue,
      targetKeysFilled: [],
      lookupStatus: 'none',
      invalidLookup: false,
    };
  }

  const { matchFound, matchedValues } = findAutoFillMatch(baseValue, template);

  if (matchFound && matchedValues) {
    const updated = { ...fieldValues };
    const targetKeysFilled: string[] = [];

    template.autoFill.targetFieldKeys.forEach((targetKey) => {
      if (matchedValues[targetKey] !== undefined) {
        updated[targetKey] = matchedValues[targetKey];
        targetKeysFilled.push(targetKey);
      }
    });

    return {
      updatedValues: updated,
      matchFound: true,
      matchedValues,
      baseValue,
      targetKeysFilled,
      lookupStatus: 'valid',
      invalidLookup: false,
    };
  }

  // Base value was provided but not found in lookup table
  const fieldLabel = baseField?.name || 'Base field';
  return {
    updatedValues: { ...fieldValues },
    matchFound: false,
    baseValue,
    targetKeysFilled: [],
    lookupStatus: 'invalid',
    invalidLookup: true,
    invalidLookupMessage: `${fieldLabel} "${baseValue}" was not found in the lookup table.`,
  };
};

/**
 * Comprehensive normalizer for template data:
 * 1. Normalizes all date fields to DD-MM-YYYY
 * 2. Overrides autofill target fields with lookup table values
 * 3. Normalizes table rows (options & dates)
 */
export const normalizeAndAutoFillTemplateData = (
  fieldValues: Record<string, any>,
  tableRows: Array<Record<string, any>> = [],
  template: DataTemplate
): {
  fieldValues: Record<string, any>;
  tableRows: Array<Record<string, any>>;
  lookupStatus: 'valid' | 'invalid' | 'none';
  invalidLookup: boolean;
  invalidLookupMessage?: string;
  targetKeysFilled: string[];
} => {
  const normalizedFields: Record<string, any> = { ...fieldValues };

  // Step 1: Normalize all Date fields to DD-MM-YYYY
  template.fields.forEach((f) => {
    const rawVal = normalizedFields[f.extractionKey];
    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
      if (f.type === 'date' || isDateField(f.extractionKey) || isDateField(f.name)) {
        normalizedFields[f.extractionKey] = normalizeDateToDDMMYYYY(rawVal);
      }
    }
  });

  // Step 2: Normalize dates and options in table rows
  const normalizedTableRows = (tableRows || []).map((row) => {
    const newRow = { ...row };
    if (template.hasTable && template.tableFields) {
      template.tableFields.forEach((col) => {
        const cellVal = newRow[col.extractionKey];
        if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
          if (col.type === 'date' || isDateField(col.extractionKey) || isDateField(col.name)) {
            newRow[col.extractionKey] = normalizeDateToDDMMYYYY(cellVal);
          }
        }
      });
    }
    return newRow;
  });

  // Step 3: Apply Auto-Fill lookups & overrides
  if (template.autoFill?.enabled) {
    const autoFillRes = applyAutoFill(normalizedFields, template);
    return {
      fieldValues: autoFillRes.updatedValues,
      tableRows: normalizedTableRows,
      lookupStatus: autoFillRes.lookupStatus,
      invalidLookup: autoFillRes.invalidLookup,
      invalidLookupMessage: autoFillRes.invalidLookupMessage,
      targetKeysFilled: autoFillRes.targetKeysFilled,
    };
  }

  return {
    fieldValues: normalizedFields,
    tableRows: normalizedTableRows,
    lookupStatus: 'none',
    invalidLookup: false,
    targetKeysFilled: [],
  };
};

/**
 * Generates downloadable or copyable sample CSV text.
 */
export const generateSampleCsv = (
  baseFieldKey: string,
  targetFieldKeys: string[],
  fields: TemplateField[]
): string => {
  const baseField = fields.find((f) => f.extractionKey === baseFieldKey);
  const targetFields = fields.filter((f) => targetFieldKeys.includes(f.extractionKey));

  const headers = [
    baseField?.name || 'Base Field',
    ...targetFields.map((f) => f.name),
  ];

  // Helper sample generator
  const getSampleVal = (f?: TemplateField, idx = 1): string => {
    if (!f) return `Val_${idx}`;
    if (f.type === 'number') return String(idx * 100);
    if (f.type === 'date') return '28-08-2026';
    if (f.type === 'time') return '10:00 AM';
    if (f.options && f.options.length > 0) return f.options[(idx - 1) % f.options.length];
    if (f.name.toLowerCase().includes('part')) return `${2340 + idx}`;
    if (f.name.toLowerCase().includes('desc')) return idx === 1 ? 'Brake Pad' : 'Oil Filter';
    if (f.name.toLowerCase().includes('cat')) return 'Automotive';
    if (f.name.toLowerCase().includes('price')) return `${350 + idx * 50}`;
    return `Sample_${idx}`;
  };

  const row1 = [getSampleVal(baseField, 1), ...targetFields.map((f) => getSampleVal(f, 1))];
  const row2 = [getSampleVal(baseField, 2), ...targetFields.map((f) => getSampleVal(f, 2))];

  return [headers.join(','), row1.join(','), row2.join(',')].join('\n');
};
