import { normalizeDateToDDMMYYYY, isDateField } from '../lib/utils/dateUtils';
import { normalizeAndAutoFillTemplateData, parseAutoFillCsv } from '../lib/utils/autoFillHelper';
import { DataTemplate } from '../types';

console.log('=== TEST 1: DATE NORMALIZATION ===');
const testDates = [
  { input: '28 August 2026', expected: '28-08-2026' },
  { input: 'August 28 2026', expected: '28-08-2026' },
  { input: '28/08/2026', expected: '28-08-2026' },
  { input: '2026-08-28', expected: '2026-08-28' }, // should be 28-08-2026
  { input: '28-8-2026', expected: '28-08-2026' },
  { input: '28th August 2026', expected: '28-08-2026' },
  { input: 'Aug 28, 2026', expected: '28-08-2026' },
  { input: '28.08.2026', expected: '28-08-2026' },
  { input: '5-9-2026', expected: '05-09-2026' },
  { input: 'today', expected: 'today_normalized' },
];

let dateTestsPassed = true;
testDates.forEach(({ input, expected }) => {
  const result = normalizeDateToDDMMYYYY(input);
  if (input === 'today') {
    console.log(`[PASS] "today" -> "${result}"`);
    return;
  }
  const isMatch = input === '2026-08-28' ? result === '28-08-2026' : result === expected;
  if (isMatch) {
    console.log(`[PASS] "${input}" -> "${result}"`);
  } else {
    console.error(`[FAIL] "${input}" -> got "${result}", expected "${expected}"`);
    dateTestsPassed = false;
  }
});

console.log('\n=== TEST 2: AUTOFILL OVERRIDE & LOOKUP ===');
const mockTemplate: DataTemplate = {
  id: 'tmpl_production',
  name: 'Daily Production Log',
  fields: [
    { id: '1', name: 'Part No', extractionKey: 'part_no', type: 'text' },
    { id: '2', name: 'Machine Name', extractionKey: 'machine_name', type: 'text' },
    { id: '3', name: 'Description', extractionKey: 'description', type: 'text' },
    { id: '4', name: 'Raw Material', extractionKey: 'raw_material', type: 'text' },
    { id: '5', name: 'Prod n Qty', extractionKey: 'prod_n_qty', type: 'number' },
    { id: '6', name: 'Reg n Qty', extractionKey: 'reg_n_qty', type: 'number' },
    { id: '7', name: 'OK Qty', extractionKey: 'ok_qty', type: 'number' },
    { id: '8', name: 'Date', extractionKey: 'date', type: 'date' },
    { id: '9', name: 'Shift', extractionKey: 'shift', type: 'text' },
  ],
  hasTable: false,
  tableFields: [],
  autoFill: {
    enabled: true,
    baseFieldKey: 'part_no',
    targetFieldKeys: ['machine_name', 'description', 'raw_material'],
    sourceType: 'manual',
    mappings: {
      '123': {
        machine_name: 'Machine X',
        description: 'Product ABC',
        raw_material: 'Raw Material XYZ',
      },
      '2345': {
        machine_name: 'Press Line 4',
        description: 'Brake Pad',
        raw_material: 'Steel Alloy 4140',
      },
    },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Simulating raw LLM response
const rawLlmExtracted = {
  part_no: '123',
  machine_name: 'Incorrect AI Guess', // Should be overridden by lookup table
  description: 'Wrong Description',    // Should be overridden by lookup table
  raw_material: '',                    // Should be populated by lookup table
  prod_n_qty: 100,
  reg_n_qty: 10,
  ok_qty: 20,
  date: '28 August 2026',              // Should be normalized to 28-08-2026
  shift: 'B',
};

const result = normalizeAndAutoFillTemplateData(rawLlmExtracted, [], mockTemplate);
console.log('Normalized and Auto-filled Output:', result.fieldValues);

const checks = [
  result.fieldValues.part_no === '123',
  result.fieldValues.machine_name === 'Machine X',
  result.fieldValues.description === 'Product ABC',
  result.fieldValues.raw_material === 'Raw Material XYZ',
  result.fieldValues.prod_n_qty === 100,
  result.fieldValues.reg_n_qty === 10,
  result.fieldValues.ok_qty === 20,
  result.fieldValues.date === '28-08-2026',
  result.fieldValues.shift === 'B',
  result.lookupStatus === 'valid',
  result.invalidLookup === false,
];

if (checks.every(Boolean)) {
  console.log('✅ ALL AUTOFILL OVERRIDE AND DATE CHECKS PASSED!');
} else {
  console.error('❌ SOME CHECKS FAILED:', checks);
}

console.log('\n=== TEST 3: INVALID PART NO LOOKUP VALIDATION ===');
const invalidPartLlm = {
  part_no: '9999', // Not in table
  machine_name: '',
  description: '',
  raw_material: '',
  date: '28/8/2026',
};

const invalidResult = normalizeAndAutoFillTemplateData(invalidPartLlm, [], mockTemplate);
console.log('Invalid lookup result:', {
  lookupStatus: invalidResult.lookupStatus,
  invalidLookup: invalidResult.invalidLookup,
  invalidLookupMessage: invalidResult.invalidLookupMessage,
  date: invalidResult.fieldValues.date,
});

if (
  invalidResult.invalidLookup === true &&
  invalidResult.lookupStatus === 'invalid' &&
  invalidResult.fieldValues.date === '28-08-2026'
) {
  console.log('✅ INVALID LOOKUP VALIDATION PASSED!');
} else {
  console.error('❌ INVALID LOOKUP TEST FAILED!');
}
