export const getTodayString = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const getYesterdayString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const getTodayIsoString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const MONTH_NAME_MAP: Record<string, string> = {
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

const padZero = (n: number | string, len = 2): string => {
  return String(n).padStart(len, '0');
};

const isValidDateParts = (day: number, month: number, year: number): boolean => {
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
};

/**
 * Normalizes any spoken or textual date string into strict DD-MM-YYYY format.
 * Examples handled:
 * - "28 August 2026" / "28 Aug 2026" / "28th August 2026" -> "28-08-2026"
 * - "August 28 2026" / "Aug 28, 2026" / "August 28th 2026" -> "28-08-2026"
 * - "28/08/2026" / "28/8/2026" / "28-08-2026" / "28-8-2026" / "28.08.2026" -> "28-08-2026"
 * - "2026-08-28" / "2026/08/28" / "2026-8-28" / "2026.08.28" -> "28-08-2026"
 * - "08/28/2026" (month first when day > 12) -> "28-08-2026"
 * - "today" -> current date in DD-MM-YYYY
 * - "yesterday" -> yesterday's date in DD-MM-YYYY
 * If the date cannot be confidently parsed, returns the original trimmed string for user review.
 */
export const normalizeDateToDDMMYYYY = (rawInput: any): string => {
  if (rawInput === null || rawInput === undefined) return '';
  const str = String(rawInput).trim();
  if (!str) return '';

  const lower = str.toLowerCase();

  // Keyword checks
  if (lower === 'today' || lower === 'aaj' || lower === 'current date') {
    return getTodayString();
  }
  if (lower === 'yesterday' || lower === 'kal') {
    return getYesterdayString();
  }

  // Check 1: Already exact DD-MM-YYYY
  const exactMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (exactMatch) {
    const d = parseInt(exactMatch[1], 10);
    const m = parseInt(exactMatch[2], 10);
    const y = parseInt(exactMatch[3], 10);
    if (isValidDateParts(d, m, y)) {
      return str;
    }
  }

  // Check 2: Pattern Day MonthName Year (e.g. "28 August 2026", "28th Aug 2026", "28-August-2026", "28/Aug/2026")
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

  // Check 3: Pattern MonthName Day Year (e.g. "August 28 2026", "Aug 28, 2026", "August 28th, 2026")
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

  // Check 4: Pattern YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (ISO format)
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

  // Check 5: Pattern DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY or MM-DD-YYYY with 4 digit year
  const dmyPattern = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/;
  const dmyMatch = str.match(dmyPattern);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    // If p1 > 12 -> p1 must be day, p2 must be month
    if (p1 > 12 && p2 <= 12 && isValidDateParts(p1, p2, year)) {
      return `${padZero(p1)}-${padZero(p2)}-${year}`;
    }
    // If p2 > 12 -> p2 must be day, p1 is month (US format MM-DD-YYYY)
    if (p2 > 12 && p1 <= 12 && isValidDateParts(p2, p1, year)) {
      return `${padZero(p2)}-${padZero(p1)}-${year}`;
    }
    // If both <= 12, default to DD-MM-YYYY standard
    if (isValidDateParts(p1, p2, year)) {
      return `${padZero(p1)}-${padZero(p2)}-${year}`;
    }
  }

  // Check 6: Pattern with 2-digit year (e.g. "28-08-26", "28/8/26")
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

  // Check 7: Try parsing with native Date if plausible
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    if (isValidDateParts(day, month, year) && year >= 1990 && year <= 2050) {
      return `${padZero(day)}-${padZero(month)}-${year}`;
    }
  }

  // Could not be confidently parsed: leave original string for user review
  return str;
};

/**
 * Checks if a field key or name represents a Date field.
 */
export const isDateField = (keyOrName: string): boolean => {
  if (!keyOrName) return false;
  const clean = keyOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === 'date' || clean.includes('date') || clean === 'dt' || clean.endsWith('date');
};

/**
 * Parses DD-MM-YYYY or ISO date string for friendly UI display (e.g. "28 Aug 2026").
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const normalized = normalizeDateToDDMMYYYY(dateStr);
  const parts = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    const year = parseInt(parts[3], 10);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return dateStr;
};

export const isThisMonth = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const normalized = normalizeDateToDDMMYYYY(dateStr);
  const parts = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const now = new Date();
  if (parts) {
    const month = parseInt(parts[2], 10);
    const year = parseInt(parts[3], 10);
    return year === now.getFullYear() && month === now.getMonth() + 1;
  }
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

export const isThisWeek = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const normalized = normalizeDateToDDMMYYYY(dateStr);
  const parts = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const now = new Date();
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    const year = parseInt(parts[3], 10);
    const d = new Date(year, month - 1, day);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
};

