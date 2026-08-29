// Pure Node.js Automated unit test suite for Shortcuts Engine & Voice Edit / Lookup Logic

function normalizeKeyCombo(combo) {
  if (!combo) return '';
  return combo
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort((a, b) => {
      const order = ['ctrl', 'meta', 'cmd', 'alt', 'shift'];
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    })
    .join('+');
}

function formatDisplayKeyCombo(combo) {
  if (!combo) return '';
  return combo
    .split('+')
    .map((part) => {
      const p = part.trim().toLowerCase();
      if (p === 'ctrl' || p === 'cmd' || p === 'meta') return 'Ctrl';
      if (p === 'alt') return 'Alt';
      if (p === 'shift') return 'Shift';
      if (p === 'enter' || p === 'return') return 'Enter';
      if (p === 'escape' || p === 'esc') return 'Esc';
      if (p === 'space') return 'Space';
      if (p === 'backspace') return 'Backspace';
      if (p === 'delete' || p === 'del') return 'Del';
      if (p === 'tab') return 'Tab';
      if (p.length === 1) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' + ');
}

function detectShortcutConflict(actionId, newKeyCombo, allShortcuts) {
  const normalizedNew = normalizeKeyCombo(newKeyCombo);
  if (!normalizedNew) return null;

  for (const item of allShortcuts) {
    if (item.id === actionId) continue;
    if (normalizeKeyCombo(item.key) === normalizedNew) {
      return item;
    }
  }
  return null;
}

const MONTH_NAME_MAP = {
  jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
  apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
  aug: '08', august: '08', sep: '09', sept: '09', september: '09', oct: '10',
  october: '10', nov: '11', november: '11', dec: '12', december: '12',
};

const padZero = (n) => String(n).padStart(2, '0');

function normalizeDateToDDMMYYYY(rawInput) {
  if (!rawInput) return '';
  const str = String(rawInput).trim();
  const wordMatch = str.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-_]+([a-zA-Z]+)[\s\-_]+(\d{4})$/);
  if (wordMatch) {
    const day = parseInt(wordMatch[1], 10);
    const monthStr = wordMatch[2].toLowerCase();
    const year = parseInt(wordMatch[3], 10);
    const month = MONTH_NAME_MAP[monthStr];
    if (month) return `${padZero(day)}-${month}-${year}`;
  }
  return str;
}

function findAutoFillMatch(baseValue, template) {
  if (!template?.autoFill?.enabled || !template.autoFill.mappings) return null;
  const normalized = String(baseValue || '').trim().toLowerCase();
  if (!normalized) return null;
  return template.autoFill.mappings[normalized] || null;
}

function applyAutoFill(currentValues, template) {
  if (!template?.autoFill?.enabled) {
    return { updatedValues: currentValues, lookupStatus: 'none' };
  }

  const baseKey = template.autoFill.baseFieldKey;
  const baseValue = currentValues[baseKey];
  const targetKeys = template.autoFill.targetFieldKeys || [];

  if (baseValue === undefined || baseValue === null || String(baseValue).trim() === '') {
    return { updatedValues: currentValues, lookupStatus: 'none' };
  }

  const matched = findAutoFillMatch(baseValue, template);

  if (matched) {
    const updated = { ...currentValues };
    targetKeys.forEach((key) => {
      if (matched[key] !== undefined) {
        updated[key] = matched[key];
      }
    });
    return {
      updatedValues: updated,
      lookupStatus: 'valid',
      invalidLookup: false,
    };
  } else {
    return {
      updatedValues: currentValues,
      lookupStatus: 'invalid',
      invalidLookup: true,
      invalidLookupMessage: `Part No "${baseValue}" was not found in the lookup table.`,
    };
  }
}

console.log('=== TEST SUITE 1: KEYBOARD SHORTCUTS MANAGER ===');

// Test 1: Key Combo Normalization
const testCombos = [
  { input: 'Ctrl + T', expected: 'ctrl+t' },
  { input: 'ctrl+shift+e', expected: 'ctrl+shift+e' },
  { input: 'Shift + Ctrl + Enter', expected: 'ctrl+shift+enter' },
  { input: 'R', expected: 'r' },
  { input: 'Escape', expected: 'escape' },
];

testCombos.forEach(({ input, expected }) => {
  const normalized = normalizeKeyCombo(input);
  console.log(`Normalizing "${input}" -> "${normalized}"`);
  if (normalized !== expected) {
    throw new Error(`Normalization mismatch for ${input}: got "${normalized}", expected "${expected}"`);
  }
});
console.log('✅ KEY COMBO NORMALIZATION PASSED PERFECTLY!\n');

// Test 2: Display Formatting
const displayCombos = [
  { input: 'ctrl+t', expected: 'Ctrl + T' },
  { input: 'ctrl+shift+e', expected: 'Ctrl + Shift + E' },
  { input: 'ctrl+enter', expected: 'Ctrl + Enter' },
  { input: 'escape', expected: 'Esc' },
  { input: 'r', expected: 'R' },
];

displayCombos.forEach(({ input, expected }) => {
  const formatted = formatDisplayKeyCombo(input);
  console.log(`Formatting "${input}" -> "${formatted}"`);
  if (formatted !== expected) {
    throw new Error(`Display mismatch for ${input}: got "${formatted}", expected "${expected}"`);
  }
});
console.log('✅ KEY COMBO DISPLAY FORMATTING PASSED PERFECTLY!\n');

// Test 3: Conflict Detection
const mockShortcuts = [
  { id: 'toggle_recording', name: 'Toggle Recording', key: 'r' },
  { id: 'new_template', name: 'New Template', key: 'ctrl+t' },
  { id: 'save_all', name: 'Save All', key: 'ctrl+enter' },
];

const conflict = detectShortcutConflict('edit_entry', 'ctrl+t', mockShortcuts);
console.log('Conflict test for "ctrl+t":', conflict ? `Detected conflict with "${conflict.name}"` : 'No conflict');
if (!conflict || conflict.id !== 'new_template') {
  throw new Error('Conflict detection failed to detect collision with new_template');
}

const noConflict = detectShortcutConflict('edit_entry', 'ctrl+e', mockShortcuts);
console.log('Conflict test for "ctrl+e":', noConflict ? `Conflict!` : 'No conflict');
if (noConflict !== null) {
  throw new Error('Conflict detection falsely triggered for unique key ctrl+e');
}
console.log('✅ SHORTCUT CONFLICT DETECTION PASSED PERFECTLY!\n');

console.log('=== TEST SUITE 2: VOICE EDIT & LOOKUP AUTOFILL RECALCULATION ===');

const mockTemplateWithAutoFill = {
  id: 'template_prod',
  name: 'Production Monitoring',
  fields: [
    { id: '1', name: 'Part No', extractionKey: 'part_no', type: 'text' },
    { id: '2', name: 'Machine Name', extractionKey: 'machine_name', type: 'text' },
    { id: '3', name: 'Description', extractionKey: 'description', type: 'text' },
    { id: '4', name: 'Raw Material', extractionKey: 'raw_material', type: 'text' },
    { id: '5', name: 'Prod Qty', extractionKey: 'prod_n_qty', type: 'number' },
    { id: '6', name: 'Date', extractionKey: 'date', type: 'date' },
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
        machine_name: 'Machine Alpha',
        description: 'Brake Disc 200mm',
        raw_material: 'Cast Iron Grade 4',
      },
      '341': {
        machine_name: 'Machine Gamma',
        description: 'Rotor Assembly X',
        raw_material: 'Titanium Composite',
      },
    },
    strictValidation: true,
  },
};

// Scenario: Existing entry with Part No 123
let entryFieldValues = {
  part_no: '123',
  machine_name: 'Machine Alpha',
  description: 'Brake Disc 200mm',
  raw_material: 'Cast Iron Grade 4',
  prod_n_qty: 50,
  date: '28-08-2026',
};

console.log('Initial Entry Field Values:', entryFieldValues);

// Voice edit update: User says "Part No 341"
const voiceUpdatedFields = { part_no: '341' };
console.log('User voice edit: Changing Part No to 341...');

// Merge and recalculate autofill
let merged = { ...entryFieldValues, ...voiceUpdatedFields };
const autoFillResult = applyAutoFill(merged, mockTemplateWithAutoFill);

console.log('Resulting Field Values after Voice Edit & Autofill:', autoFillResult.updatedValues);

if (
  autoFillResult.updatedValues.part_no !== '341' ||
  autoFillResult.updatedValues.machine_name !== 'Machine Gamma' ||
  autoFillResult.updatedValues.description !== 'Rotor Assembly X' ||
  autoFillResult.updatedValues.raw_material !== 'Titanium Composite' ||
  autoFillResult.updatedValues.prod_n_qty !== 50
) {
  throw new Error('Voice Edit Autofill recalculation failed!');
}
console.log('✅ VOICE EDIT AUTOFILL RECALCULATION PASSED PERFECTLY!\n');

// Scenario: Date voice edit "28 August 2026"
const voiceDateEdit = { date: normalizeDateToDDMMYYYY('28 August 2026') };
merged = { ...autoFillResult.updatedValues, ...voiceDateEdit };
console.log('After Date Voice Edit ("28 August 2026"):', merged.date);
if (merged.date !== '28-08-2026') {
  throw new Error('Date normalization during voice edit failed!');
}
console.log('✅ VOICE EDIT DATE NORMALIZATION PASSED PERFECTLY!\n');

console.log('🎉 ALL TEST SUITES PASSED WITH 100% SUCCESS!');
