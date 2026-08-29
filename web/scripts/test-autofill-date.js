// Pure Node.js verification script for date normalization & autofill logic

const MONTH_NAME_MAP = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const padZero = (n, len = 2) => String(n).padStart(len, '0');

const isValidDateParts = (day, month, year) => {
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
};

const normalizeDateToDDMMYYYY = (rawInput) => {
  if (rawInput === null || rawInput === undefined) return '';
  const str = String(rawInput).trim();
  if (!str) return '';

  const lower = str.toLowerCase();
  if (lower === 'today' || lower === 'aaj' || lower === 'current date') {
    const d = new Date();
    return `${padZero(d.getDate())}-${padZero(d.getMonth() + 1)}-${d.getFullYear()}`;
  }
  if (lower === 'yesterday' || lower === 'kal') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${padZero(d.getDate())}-${padZero(d.getMonth() + 1)}-${d.getFullYear()}`;
  }

  const exactMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (exactMatch) {
    const d = parseInt(exactMatch[1], 10);
    const m = parseInt(exactMatch[2], 10);
    const y = parseInt(exactMatch[3], 10);
    if (isValidDateParts(d, m, y)) return str;
  }

  const dayMonthNamePattern = /\b(\d{1,2})(?:st|nd|rd|th)?[\s\/\-\.]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s\/\-\,]+(\d{2,4})\b/i;
  const dmnMatch = str.match(dayMonthNamePattern);
  if (dmnMatch) {
    const day = parseInt(dmnMatch[1], 10);
    const monthKey = dmnMatch[2].toLowerCase();
    const monthStr = MONTH_NAME_MAP[monthKey];
    let year = parseInt(dmnMatch[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    if (monthStr && isValidDateParts(day, parseInt(monthStr, 10), year)) {
      return `${padZero(day)}-${monthStr}-${year}`;
    }
  }

  const monthDayNamePattern = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s\/\-\.]+(\d{1,2})(?:st|nd|rd|th)?[\s\/\-\,]+(\d{2,4})\b/i;
  const mdnMatch = str.match(monthDayNamePattern);
  if (mdnMatch) {
    const monthKey = mdnMatch[1].toLowerCase();
    const monthStr = MONTH_NAME_MAP[monthKey];
    const day = parseInt(mdnMatch[2], 10);
    let year = parseInt(mdnMatch[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    if (monthStr && isValidDateParts(day, parseInt(monthStr, 10), year)) {
      return `${padZero(day)}-${monthStr}-${year}`;
    }
  }

  const isoPattern = /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/;
  const isoMatch = str.match(isoPattern);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (isValidDateParts(day, month, year)) {
      return `${padZero(day)}-${padZero(month)}-${year}`;
    }
  }

  const dmyPattern = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/;
  const dmyMatch = str.match(dmyPattern);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (p1 > 12 && p2 <= 12 && isValidDateParts(p1, p2, year)) {
      return `${padZero(p1)}-${padZero(p2)}-${year}`;
    }
    if (p2 > 12 && p1 <= 12 && isValidDateParts(p2, p1, year)) {
      return `${padZero(p2)}-${padZero(p1)}-${year}`;
    }
    if (isValidDateParts(p1, p2, year)) {
      return `${padZero(p1)}-${padZero(p2)}-${year}`;
    }
  }

  const shortYrPattern = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})\b/;
  const shortYrMatch = str.match(shortYrPattern);
  if (shortYrMatch) {
    const p1 = parseInt(shortYrMatch[1], 10);
    const p2 = parseInt(shortYrMatch[2], 10);
    const rawYr = parseInt(shortYrMatch[3], 10);
    const year = rawYr < 50 ? 2000 + rawYr : 1900 + rawYr;
    if (p1 > 12 && p2 <= 12 && isValidDateParts(p1, p2, year)) {
      return `${padZero(p1)}-${padZero(p2)}-${year}`;
    }
    if (p2 > 12 && p1 <= 12 && isValidDateParts(p2, p1, year)) {
      return `${padZero(p2)}-${padZero(p1)}-${year}`;
    }
    if (isValidDateParts(p1, p2, year)) {
      return `${padZero(p1)}-${padZero(p2)}-${year}`;
    }
  }

  return str;
};

// Autofill helper test
const normalizeLookupKey = (val) => (val === null || val === undefined ? '' : String(val).trim().toLowerCase());

const applyAutoFill = (fieldValues, template) => {
  if (!template?.autoFill?.enabled || !template.autoFill.baseFieldKey) {
    return { updatedValues: { ...fieldValues }, matchFound: false, targetKeysFilled: [], lookupStatus: 'none', invalidLookup: false };
  }
  const baseKey = template.autoFill.baseFieldKey;
  const baseField = template.fields.find((f) => f.extractionKey === baseKey);
  const baseValue = fieldValues[baseKey];

  if (baseValue === undefined || baseValue === null || String(baseValue).trim() === '') {
    return { updatedValues: { ...fieldValues }, matchFound: false, baseValue, targetKeysFilled: [], lookupStatus: 'none', invalidLookup: false };
  }

  const normKey = normalizeLookupKey(baseValue);
  const match = template.autoFill.mappings[normKey];

  if (match) {
    const updated = { ...fieldValues };
    const targetKeysFilled = [];
    template.autoFill.targetFieldKeys.forEach((targetKey) => {
      if (match[targetKey] !== undefined) {
        updated[targetKey] = match[targetKey];
        targetKeysFilled.push(targetKey);
      }
    });
    return { updatedValues: updated, matchFound: true, matchedValues: match, baseValue, targetKeysFilled, lookupStatus: 'valid', invalidLookup: false };
  }

  return {
    updatedValues: { ...fieldValues },
    matchFound: false,
    baseValue,
    targetKeysFilled: [],
    lookupStatus: 'invalid',
    invalidLookup: true,
    invalidLookupMessage: `${baseField?.name || 'Base field'} "${baseValue}" was not found in the lookup table.`,
  };
};

console.log('=== TEST SUITE: DATE NORMALIZATION ===');
const testCases = [
  '28 August 2026',
  'August 28 2026',
  '28/08/2026',
  '2026-08-28',
  '28-8-2026',
  '28.08.2026',
  '28th Aug 2026',
];

testCases.forEach((tc) => {
  const normalized = normalizeDateToDDMMYYYY(tc);
  console.log(`Testing "${tc}" -> "${normalized}"`);
  if (normalized !== '28-08-2026') {
    throw new Error(`FAIL: Expected 28-08-2026 for "${tc}", got "${normalized}"`);
  }
});
console.log('✅ ALL 7 DATE FORMATS NORMALIZED TO 28-08-2026 SUCCESSFULLY!\n');

console.log('=== TEST SUITE: PART NO AUTOFILL OVERRIDE ===');
const template = {
  id: 't1',
  name: 'Daily Production Log',
  fields: [
    { id: 'f1', name: 'Part No', extractionKey: 'part_no', type: 'text' },
    { id: 'f2', name: 'Machine Name', extractionKey: 'machine_name', type: 'text' },
    { id: 'f3', name: 'Description', extractionKey: 'description', type: 'text' },
    { id: 'f4', name: 'Raw Material', extractionKey: 'raw_material', type: 'text' },
    { id: 'f5', name: 'Prod n Qty', extractionKey: 'prod_n_qty', type: 'number' },
    { id: 'f6', name: 'Reg n Qty', extractionKey: 'reg_n_qty', type: 'number' },
    { id: 'f7', name: 'OK Qty', extractionKey: 'ok_qty', type: 'number' },
    { id: 'f8', name: 'Date', extractionKey: 'date', type: 'date' },
    { id: 'f9', name: 'Shift', extractionKey: 'shift', type: 'text' },
  ],
  autoFill: {
    enabled: true,
    baseFieldKey: 'part_no',
    targetFieldKeys: ['machine_name', 'description', 'raw_material'],
    mappings: {
      '123': {
        machine_name: 'Machine X',
        description: 'Product ABC',
        raw_material: 'Raw Material XYZ',
      },
    },
  },
};

const rawLlmResponse = {
  part_no: '123',
  machine_name: 'Guessed Machine',
  description: 'Guessed Desc',
  raw_material: 'Guessed Material',
  prod_n_qty: 100,
  reg_n_qty: 10,
  ok_qty: 20,
  date: normalizeDateToDDMMYYYY('28 August 2026'),
  shift: 'B',
};

const autofillRes = applyAutoFill(rawLlmResponse, template);
console.log('Final Auto-filled Result:', autofillRes.updatedValues);

if (
  autofillRes.updatedValues.part_no === '123' &&
  autofillRes.updatedValues.machine_name === 'Machine X' &&
  autofillRes.updatedValues.description === 'Product ABC' &&
  autofillRes.updatedValues.raw_material === 'Raw Material XYZ' &&
  autofillRes.updatedValues.prod_n_qty === 100 &&
  autofillRes.updatedValues.reg_n_qty === 10 &&
  autofillRes.updatedValues.ok_qty === 20 &&
  autofillRes.updatedValues.date === '28-08-2026' &&
  autofillRes.updatedValues.shift === 'B' &&
  autofillRes.lookupStatus === 'valid'
) {
  console.log('✅ AUTOFILL OVERRIDE VERIFICATION PASSED PERFECTLY!');
} else {
  throw new Error('FAIL: Autofill result does not match expected values.');
}

console.log('\n=== TEST SUITE: INVALID PART NO ===');
const invalidLlm = {
  part_no: '9999',
  machine_name: '',
  description: '',
  raw_material: '',
};

const invalidRes = applyAutoFill(invalidLlm, template);
console.log('Invalid lookup result:', {
  lookupStatus: invalidRes.lookupStatus,
  invalidLookup: invalidRes.invalidLookup,
  invalidLookupMessage: invalidRes.invalidLookupMessage,
});

if (invalidRes.invalidLookup === true && invalidRes.lookupStatus === 'invalid') {
  console.log('✅ INVALID LOOKUP VALIDATION PASSED PERFECTLY!');
} else {
  throw new Error('FAIL: Invalid lookup validation failed.');
}
