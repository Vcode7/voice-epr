import { DataTemplate, DataEntryRecord, SessionDataEntry } from '@/types';
import { SYSTEM_DEFAULT_TEMPLATES, DEFAULT_MONITORING_DETAILS_TEMPLATE } from '@/lib/constants';

/**
 * Normalizes a string for fuzzy slug matching (lowercased, alphanumeric only).
 */
export function normalizeSlug(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves a template by identifier (ID, Name, or Kebab/Snake Slug).
 */
export function findTemplateBySlugOrId(
  identifier: string,
  templates: DataTemplate[],
  existingRecords?: DataEntryRecord[]
): DataTemplate | null {
  if (!identifier) return null;
  const rawId = decodeURIComponent(identifier).trim();
  const normalizedTarget = normalizeSlug(rawId);

  // 1. Combine provided templates with system defaults
  const allKnownTemplates = [...templates];
  for (const sysTmpl of SYSTEM_DEFAULT_TEMPLATES) {
    if (!allKnownTemplates.some((t) => t.id === sysTmpl.id)) {
      allKnownTemplates.push(sysTmpl);
    }
  }

  // 2. Check exact ID
  const byId = allKnownTemplates.find((t) => t.id === rawId || t.id.toLowerCase() === rawId.toLowerCase());
  if (byId) return byId;

  // 3. Check exact Name
  const byName = allKnownTemplates.find((t) => t.name.toLowerCase() === rawId.toLowerCase());
  if (byName) return byName;

  // 4. Check normalized slug on ID
  const bySlugId = allKnownTemplates.find((t) => normalizeSlug(t.id) === normalizedTarget);
  if (bySlugId) return bySlugId;

  // 5. Check normalized slug on Name
  const bySlugName = allKnownTemplates.find((t) => normalizeSlug(t.name) === normalizedTarget);
  if (bySlugName) return bySlugName;

  // 6. Check common aliases
  if (
    normalizedTarget === 'monitoringdetails' ||
    normalizedTarget === 'defaultmonitoringdetails' ||
    normalizedTarget === 'defaulttemplate'
  ) {
    return DEFAULT_MONITORING_DETAILS_TEMPLATE;
  }

  // 7. Check if it's the virtual flexible template
  if (normalizedTarget === 'flexible' || normalizedTarget === 'flexibledatarecord') {
    return {
      id: 'flexible',
      name: 'Flexible Record',
      description: 'Dynamic schema-free voice dictation record',
      fields: [],
      hasTable: false,
      tableFields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 8. Fuzzy substring match on ID or Name
  const bySubstring = allKnownTemplates.find(
    (t) =>
      normalizedTarget.includes(normalizeSlug(t.name)) ||
      normalizeSlug(t.name).includes(normalizedTarget) ||
      normalizedTarget.includes(normalizeSlug(t.id)) ||
      normalizeSlug(t.id).includes(normalizedTarget)
  );
  if (bySubstring) return bySubstring;

  // 9. If existing records provided, check if records exist with this templateId or templateName
  if (existingRecords && existingRecords.length > 0) {
    const recordMatch = existingRecords.find(
      (r) =>
        r.templateId === rawId ||
        r.templateName?.toLowerCase() === rawId.toLowerCase() ||
        normalizeSlug(r.templateId || '') === normalizedTarget ||
        normalizeSlug(r.templateName || '') === normalizedTarget
    );
    if (recordMatch) {
      return {
        id: recordMatch.templateId,
        name: recordMatch.templateName || rawId,
        description: 'Dynamic Record Template',
        fields: [],
        hasTable: false,
        tableFields: [],
        createdAt: recordMatch.createdAt,
        updatedAt: recordMatch.updatedAt || recordMatch.createdAt,
      };
    }
  }

  return null;
}

/**
 * Parses diverse date formats (DD-MM-YYYY, YYYY-MM-DD, ISO timestamps) into a Date object or null.
 */
export function parseFlexibleDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  const str = String(dateStr).trim();
  if (!str) return null;

  // Case 1: DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  // Case 2: YYYY-MM-DD or ISO string
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  // Case 3: Standard JS Date parse fallback
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export interface FormattedDataEntryItem {
  id: string;
  template: string;
  template_id?: string;
  parent_record_id?: string;
  data: Record<string, any>;
  table_rows?: any[];
  raw_transcript?: string | null;
  date: string;
  created_at: string;
  [key: string]: any;
}

/**
 * Extracts and normalizes items from DataEntryRecords into flat data items for template queries.
 */
export function extractItemsFromRecords(
  records: DataEntryRecord[],
  targetTemplate?: DataTemplate | null
): FormattedDataEntryItem[] {
  const items: FormattedDataEntryItem[] = [];

  for (const record of records) {
    // If targetTemplate specified, verify template match
    if (targetTemplate) {
      const isFlexTarget = targetTemplate.id === 'flexible';
      if (isFlexTarget) {
        if (!record.isFlexible && record.templateId !== 'flexible' && !record.flexibleFields) {
          continue;
        }
      } else {
        const targetIdNorm = normalizeSlug(targetTemplate.id || '');
        const targetNameNorm = normalizeSlug(targetTemplate.name || '');
        const recIdNorm = normalizeSlug(record.templateId || '');
        const recNameNorm = normalizeSlug(record.templateName || '');

        const isDefaultPair =
          (targetIdNorm.includes('monitoring') || targetIdNorm.includes('default') || targetNameNorm.includes('monitoring') || targetNameNorm.includes('default')) &&
          (recIdNorm.includes('monitoring') || recIdNorm.includes('default') || recNameNorm.includes('monitoring') || recNameNorm.includes('default'));

        const matchesId = record.templateId === targetTemplate.id;
        const matchesName = record.templateName?.toLowerCase() === targetTemplate.name.toLowerCase();
        const matchesSlug =
          recIdNorm === targetIdNorm ||
          recNameNorm === targetNameNorm ||
          recIdNorm === targetNameNorm ||
          recNameNorm === targetIdNorm;

        const matchesFuzzy =
          (targetNameNorm && recNameNorm.includes(targetNameNorm)) ||
          (recNameNorm && targetNameNorm.includes(recNameNorm)) ||
          (targetIdNorm && recIdNorm.includes(targetIdNorm)) ||
          (recIdNorm && targetIdNorm.includes(recIdNorm));

        if (!matchesId && !matchesName && !matchesSlug && !isDefaultPair && !matchesFuzzy) {
          continue;
        }
      }
    }

    const templateIdentifier = record.templateName || record.templateId || (record.isFlexible ? 'flexible' : 'default');

    // If record contains multiple child entries in `record.entries`
    if (record.entries && Array.isArray(record.entries) && record.entries.length > 0) {
      for (const entry of record.entries) {
        const entryFieldValues =
          entry.fieldValues && Object.keys(entry.fieldValues).length > 0
            ? entry.fieldValues
            : entry.flexibleFields
            ? entry.flexibleFields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {})
            : {};

        items.push({
          id: entry.id || `${record.id}_entry_${entry.entryNumber}`,
          parent_record_id: record.id,
          template: entry.templateName || templateIdentifier,
          template_id: entry.templateId || record.templateId,
          data: entryFieldValues,
          ...entryFieldValues, // spread directly for convenient root access e.g. { id, part_no, issue, action }
          table_rows: entry.tableRows && entry.tableRows.length > 0 ? entry.tableRows : undefined,
          raw_transcript: entry.rawTranscript || undefined,
          date: record.date || (entry.createdAt ? entry.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          created_at: entry.createdAt || record.createdAt,
        });
      }
    } else {
      // Single record
      const fieldValues =
        record.fieldValues && Object.keys(record.fieldValues).length > 0
          ? record.fieldValues
          : record.flexibleFields
          ? record.flexibleFields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {})
          : {};

      items.push({
        id: record.id,
        template: templateIdentifier,
        template_id: record.templateId,
        data: fieldValues,
        ...fieldValues, // spread directly for convenient root access
        table_rows: record.tableRows && record.tableRows.length > 0 ? record.tableRows : undefined,
        raw_transcript: record.rawTranscript || undefined,
        date: record.date || (record.createdAt ? record.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        created_at: record.createdAt,
      });
    }
  }

  return items;
}

/**
 * Dynamically filters items by ID, Date/Date Ranges, and arbitrary template fields.
 */
export function filterItems(
  items: FormattedDataEntryItem[],
  filters: Record<string, any>
): FormattedDataEntryItem[] {
  if (!filters || typeof filters !== 'object' || Object.keys(filters).length === 0) {
    return items;
  }

  const specialKeys = new Set([
    'date_from',
    'date_to',
    'date_start',
    'date_end',
    'from',
    'to',
    'startdate',
    'enddate',
    'start_date',
    'end_date',
    'limit',
    'offset',
    'page',
  ]);

  // Extract date range filters
  const fromRaw =
    filters.date_from ||
    filters.date_start ||
    filters.from ||
    filters.startDate ||
    filters.start_date;
  const toRaw =
    filters.date_to ||
    filters.date_end ||
    filters.to ||
    filters.endDate ||
    filters.end_date;

  const fromDate = fromRaw ? parseFlexibleDate(fromRaw) : null;
  const toDate = toRaw ? parseFlexibleDate(toRaw) : null;

  // Set start of day and end of day for precise comparison
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  return items.filter((item) => {
    // 1. ID Filter
    if (filters.id) {
      const targetId = String(filters.id).toLowerCase().trim();
      const itemId = String(item.id).toLowerCase().trim();
      const parentId = String(item.parent_record_id || '').toLowerCase().trim();
      if (itemId !== targetId && parentId !== targetId && !itemId.includes(targetId)) {
        return false;
      }
    }

    // 2. Exact Date Filter (if specific date provided)
    if (filters.date) {
      const targetDate = parseFlexibleDate(filters.date);
      const itemDate = parseFlexibleDate(item.date || item.created_at);
      if (targetDate && itemDate) {
        targetDate.setHours(0, 0, 0, 0);
        const itemDay = new Date(itemDate);
        itemDay.setHours(0, 0, 0, 0);
        if (targetDate.getTime() !== itemDay.getTime()) {
          return false;
        }
      } else {
        const dateStr = String(filters.date).toLowerCase().trim();
        const itemDateStr = String(item.date || '').toLowerCase().trim();
        if (!itemDateStr.includes(dateStr)) return false;
      }
    }

    // 3. Date Range (From / To)
    if (fromDate || toDate) {
      const itemDate = parseFlexibleDate(item.date || item.created_at);
      if (itemDate) {
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
      }
    }

    // 4. Dynamic Field Filters (matches against any template field)
    for (const [key, filterValue] of Object.entries(filters)) {
      if (specialKeys.has(key.toLowerCase()) || key === 'id' || key === 'date') {
        continue;
      }

      if (filterValue === undefined || filterValue === null || filterValue === '') {
        continue;
      }

      const normalizedFilterKey = normalizeSlug(key);
      const targetValStr = String(filterValue).toLowerCase().trim();

      // Look up matching field value in item.data or item root
      let foundValue: any = undefined;

      // Check item.data
      if (item.data && typeof item.data === 'object') {
        if (key in item.data) {
          foundValue = item.data[key];
        } else {
          // Fuzzy key match (e.g. part_no vs partNo vs "Part No")
          for (const [dKey, dVal] of Object.entries(item.data)) {
            if (normalizeSlug(dKey) === normalizedFilterKey) {
              foundValue = dVal;
              break;
            }
          }
        }
      }

      // Check item root if not found
      if (foundValue === undefined && key in item) {
        foundValue = item[key];
      }

      if (foundValue === undefined) {
        // Field does not exist on this item
        return false;
      }

      // Compare value
      if (typeof filterValue === 'boolean') {
        const itemBool = foundValue === true || String(foundValue).toLowerCase() === 'true';
        if (itemBool !== filterValue) return false;
      } else if (typeof filterValue === 'number') {
        const itemNum = Number(foundValue);
        if (isNaN(itemNum) || itemNum !== Number(filterValue)) return false;
      } else {
        const itemValStr = String(foundValue).toLowerCase().trim();
        if (itemValStr !== targetValStr && !itemValStr.includes(targetValStr)) {
          return false;
        }
      }
    }

    return true;
  });
}
