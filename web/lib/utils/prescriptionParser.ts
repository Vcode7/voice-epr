/**
 * Deterministic parser for label-driven prescription dictation, e.g.
 *   "diagnosis headache, medicine Dolo, frequency 101, duration 5 days, and continue"
 *
 * Every spoken label ("diagnosis", "medicine", "frequency", ...) starts a new value that runs until
 * the next label, so one field can never swallow another. Pure functions, no I/O.
 */

export interface ParsedMedicine {
  name: string;
  dosage: string;
  timing: 'AF' | 'BF' | '';
  frequency: string;
  duration: string;
  instructions: string;
}

export interface ParsedLabelledPrescription {
  /** True when at least one label was recognised in the text. */
  hasLabels: boolean;
  patientName?: string;
  age?: string;
  gender?: string;
  phone?: string;
  diagnosis?: string;
  notes?: string;
  medicines: ParsedMedicine[];
}

type LabelKey =
  | 'patientName'
  | 'age'
  | 'gender'
  | 'phone'
  | 'diagnosis'
  | 'medicine'
  | 'dosage'
  | 'frequency'
  | 'duration'
  | 'timing'
  | 'instructions'
  | 'notes';

const LABELS: Array<[LabelKey, string]> = [
  ['patientName', 'patient\\s+name|patient'],
  ['age', 'age'],
  ['gender', 'gender|sex'],
  ['phone', 'phone(?:\\s+number)?|mobile(?:\\s+number)?|contact(?:\\s+number)?'],
  ['diagnosis', 'diagnosis|diagnosed\\s+(?:with|as)|chief\\s+complaints?|complaints?'],
  ['medicine', 'medicine\\s+name|medicines?|medications?|drug'],
  ['dosage', 'dosage|dose'],
  ['frequency', 'frequency'],
  ['duration', 'duration'],
  ['timing', 'timing'],
  ['instructions', 'instructions?'],
  ['notes', 'notes?|advice|follow[\\s-]?up'],
];

const LABEL_REGEX = new RegExp(
  `\\b(${LABELS.map(([key, pattern]) => `(?<${key}>${pattern})`).join('|')})\\b`,
  'gi'
);

/** Words people say to move on; they are never part of a field value. */
const TRAILING_FILLER =
  /(?:[\s,.;:-]+(?:and\s+)?(?:then\s+)?(?:continue|next(?:\s+one)?|next\s+medicine|that'?s\s+all|that\s+is\s+all|done|finished|stop|end|over))+[\s,.;:!?-]*$/i;

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
};

const cleanValue = (raw: string): string =>
  raw
    .replace(/^[\s,.;:=-]+/, '')
    .replace(/^(?:is|are|was|as|of)\s+/i, '')
    .replace(TRAILING_FILLER, '')
    .replace(/[\s,.;:-]+(?:and|then)?\s*$/i, '')
    .replace(/[\s,.;:-]+$/, '')
    .trim();

/**
 * Frequency as dictated: digits only ("101", "1 0 1", "1-0-1", "one zero one") become "1-0-1".
 * Anything else ("twice daily", "SOS", "0.5-0-0.5") is kept exactly as given — never rejected.
 */
export function normalizeFrequency(value: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';

  const tokens = raw.toLowerCase().split(/[\s,-]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((t) => t in NUMBER_WORDS)) {
    return tokens.map((t) => NUMBER_WORDS[t]).join('-');
  }

  if (/^[\d\s,-]+$/.test(raw) && /\d/.test(raw)) {
    const digits = raw.replace(/\D/g, '');
    return digits.split('').join('-');
  }
  return raw;
}

const upperFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Pulls duration / timing / dose / frequency phrases that were spoken inside the medicine name itself. */
function splitInlineMedicineDetails(text: string): Partial<ParsedMedicine> & { name: string } {
  let name = text;
  const out: Partial<ParsedMedicine> = {};

  const duration = name.match(/\b(?:for\s+)?(\d+)\s*(day|week|month)s?\b/i);
  if (duration) {
    out.duration = `${duration[1]} ${duration[2].toLowerCase()}${duration[1] === '1' ? '' : 's'}`;
    name = name.replace(duration[0], ' ');
  }

  const timing = name.match(/\b(before|after)\s+(?:food|meals?|breakfast|lunch|dinner)\b|\bempty\s+stomach\b/i);
  if (timing) {
    out.timing = /^before|empty/i.test(timing[0]) ? 'BF' : 'AF';
    name = name.replace(timing[0], ' ');
  }

  const dosage = name.match(/\b(\d+)\s*(tablets?|tabs?|capsules?|caps?)\b/i);
  if (dosage) {
    out.dosage = dosage[0].trim();
    name = name.replace(dosage[0], ' ');
  }

  const freqWords: Array<[RegExp, string]> = [
    [/\b(?:four\s+times|4\s+times|qid)\b(?:\s+(?:a\s+|per\s+)?(?:day|daily))?/i, '1-1-1-1'],
    [/\b(?:thrice|three\s+times|3\s+times|tds|tid)\b(?:\s+(?:a\s+|per\s+)?(?:day|daily))?/i, '1-1-1'],
    [/\b(?:twice|two\s+times|2\s+times|bd|bid)\b(?:\s+(?:a\s+|per\s+)?(?:day|daily))?/i, '1-0-1'],
    [/\b(?:once|one\s+time|od)\b(?:\s+(?:a\s+|per\s+)?(?:day|daily))?/i, '1-0-0'],
  ];
  const hyphenated = name.match(/\b\d\s*-\s*\d\s*-\s*\d(?:\s*-\s*\d)?\b/);
  if (hyphenated) {
    out.frequency = hyphenated[0].replace(/\s+/g, '');
    name = name.replace(hyphenated[0], ' ');
  } else {
    for (const [re, value] of freqWords) {
      const hit = name.match(re);
      if (hit) {
        out.frequency = value;
        name = name.replace(hit[0], ' ');
        break;
      }
    }
  }

  return { ...out, name: cleanValue(name.replace(/\s+/g, ' ')) };
}

/**
 * Splits dictation into label/value segments and groups them into patient fields, a diagnosis and
 * a list of medicines. A new "medicine" label always starts a new medicine; dosage / frequency /
 * duration / timing / instructions attach to the medicine they follow.
 */
export function parseLabelledPrescription(transcript: string): ParsedLabelledPrescription {
  const text = (transcript || '').replace(/\s+/g, ' ').trim();
  const result: ParsedLabelledPrescription = { hasLabels: false, medicines: [] };
  if (!text) return result;

  const hits: Array<{ key: LabelKey; start: number; end: number }> = [];
  for (const m of text.matchAll(LABEL_REGEX)) {
    const groups = m.groups || {};
    const key = (Object.keys(groups).find((k) => groups[k] !== undefined) || '') as LabelKey;
    if (key) hits.push({ key, start: m.index!, end: m.index! + m[0].length });
  }
  if (hits.length === 0) return result;
  result.hasLabels = true;

  let current: ParsedMedicine | null = null;
  const startMedicine = (name: string) => {
    current = { name, dosage: '', timing: '', frequency: '', duration: '', instructions: '' };
    result.medicines.push(current);
    return current;
  };

  hits.forEach((hit, i) => {
    const value = cleanValue(text.slice(hit.end, i + 1 < hits.length ? hits[i + 1].start : text.length));

    switch (hit.key) {
      case 'patientName':
        if (value) result.patientName = value.replace(/\s+(?:aged?|years?|phone|email)\b.*$/i, '').trim();
        break;
      case 'age': {
        const n = value.match(/\d{1,3}/);
        if (n) result.age = `${n[0]} Yrs`;
        break;
      }
      case 'gender': {
        if (/\bfemale\b/i.test(value)) result.gender = 'Female';
        else if (/\bmale\b/i.test(value)) result.gender = 'Male';
        else if (/\bother\b/i.test(value)) result.gender = 'Other';
        break;
      }
      case 'phone': {
        const digits = value.replace(/[^\d+]/g, '');
        if (digits.replace(/\D/g, '').length >= 7) result.phone = digits;
        break;
      }
      case 'diagnosis':
        if (value) result.diagnosis = value;
        break;
      case 'notes':
        if (value) result.notes = result.notes ? `${result.notes}. ${value}` : value;
        break;
      case 'medicine': {
        if (!value) {
          startMedicine('');
          break;
        }
        const inline = splitInlineMedicineDetails(value);
        const med = startMedicine(upperFirst(inline.name));
        if (inline.dosage) med.dosage = inline.dosage;
        if (inline.timing) med.timing = inline.timing;
        if (inline.frequency) med.frequency = inline.frequency;
        if (inline.duration) med.duration = inline.duration;
        break;
      }
      case 'dosage':
        if (current && value) (current as ParsedMedicine).dosage = value;
        break;
      case 'frequency':
        if (current && value) (current as ParsedMedicine).frequency = normalizeFrequency(value);
        break;
      case 'duration':
        if (current && value) (current as ParsedMedicine).duration = value;
        break;
      case 'timing':
        if (current && value) {
          (current as ParsedMedicine).timing = /\b(?:before|bf|empty)\b/i.test(value) ? 'BF' : 'AF';
        }
        break;
      case 'instructions':
        if (current && value) (current as ParsedMedicine).instructions = value;
        break;
    }
  });

  result.medicines = result.medicines.filter((m) => m.name);
  return result;
}
