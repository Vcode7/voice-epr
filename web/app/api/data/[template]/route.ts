import { NextRequest, NextResponse } from 'next/server';
import { dbDataEntries, dbTemplates } from '@/lib/db/models';
import { validateApiRequest, unauthorizedResponse } from '@/lib/api/auth';
import {
  findTemplateBySlugOrId,
  extractItemsFromRecords,
  filterItems,
} from '@/lib/api/templateHelper';

/**
 * Common handler for processing template data queries with dynamic filtering.
 */
async function processTemplateDataRequest(
  req: NextRequest,
  templateParam: string,
  rawFilters: Record<string, any> = {}
) {
  // 1. Auth check
  const authResult = validateApiRequest(req);
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult);
  }

  const templateIdentifier = decodeURIComponent(templateParam).trim();
  const allTemplates = await dbTemplates.getAll();
  const allRecords = await dbDataEntries.getAll();

  // 2. Resolve target template
  const matchedTemplate = findTemplateBySlugOrId(templateIdentifier, allTemplates, allRecords);
  if (!matchedTemplate) {
    const available = allTemplates.map((t) => ({ id: t.id, name: t.name }));
    return NextResponse.json(
      {
        error: `Template "${templateIdentifier}" not found.`,
        available_templates: available,
        suggestion: 'Use one of the available template names/ids or "flexible".',
      },
      { status: 404 }
    );
  }

  // 3. Extract individual items belonging to this template
  const extractedItems = extractItemsFromRecords(allRecords, matchedTemplate);

  // 5. Apply dynamic filters
  const filteredItems = filterItems(extractedItems, rawFilters);

  // 6. Format clean data array
  const formattedData = filteredItems.map((item) => {
    // Flatten data fields directly onto the object while keeping data dict
    const dataFields = item.data || {};
    return {
      id: item.id,
      ...dataFields,
      ...(item.table_rows && item.table_rows.length > 0 ? { table_rows: item.table_rows } : {}),
      ...(item.raw_transcript ? { raw_transcript: item.raw_transcript } : {}),
      date: item.date,
      created_at: item.created_at,
    };
  });

  const hasFilters = rawFilters && Object.keys(rawFilters).length > 0;

  return NextResponse.json({
    template: matchedTemplate.name,
    template_id: matchedTemplate.id,
    count: formattedData.length,
    ...(hasFilters ? { filters_applied: rawFilters } : {}),
    data: formattedData,
  });
}

/**
 * GET /api/data/{template-name}
 * Returns all saved records for the specified template. Supports query parameter filtering.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ template: string }> }
) {
  try {
    const { template } = await params;
    const { searchParams } = new URL(req.url);

    // Convert search params into a filter object
    const queryFilters: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      queryFilters[key] = val;
    });

    return await processTemplateDataRequest(req, template, queryFilters);
  } catch (error: any) {
    console.error('❌ [/api/data/[template] GET error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve template data.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/{template-name}
 * Returns filtered records for the specified template based on JSON request body filters.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ template: string }> }
) {
  try {
    const { template } = await params;

    let bodyFilters: Record<string, any> = {};
    try {
      const body = await req.json();
      if (body && typeof body === 'object') {
        // Support both { filters: { ... } } and direct { id: '...', ... }
        bodyFilters = body.filters && typeof body.filters === 'object' ? body.filters : body;
      }
    } catch {
      // Empty body or non-JSON body: proceed without filters
      bodyFilters = {};
    }

    return await processTemplateDataRequest(req, template, bodyFilters);
  } catch (error: any) {
    console.error('❌ [/api/data/[template] POST error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to filter template data.' },
      { status: 500 }
    );
  }
}
