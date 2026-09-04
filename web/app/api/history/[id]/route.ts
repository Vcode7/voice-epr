import { NextRequest, NextResponse } from 'next/server';
import { dbDataEntries } from '@/lib/db/models';
import { validateApiRequest, unauthorizedResponse } from '@/lib/api/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth check (open by default, prepared for future API keys)
    const authResult = validateApiRequest(req);
    if (!authResult.authorized) {
      return unauthorizedResponse(authResult);
    }

    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    if (!decodedId) {
      return NextResponse.json({ error: 'Record ID is required.' }, { status: 400 });
    }

    // 2. Direct parent record lookup
    const record = await dbDataEntries.getById(decodedId);

    if (record) {
      // Extract field values
      const baseFieldValues =
        record.fieldValues && Object.keys(record.fieldValues).length > 0
          ? record.fieldValues
          : record.flexibleFields
          ? record.flexibleFields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {})
          : {};

      const childEntries = record.entries && Array.isArray(record.entries) ? record.entries : [];

      // If record has multiple child entries, structure cleanly
      if (childEntries.length > 1) {
        return NextResponse.json({
          id: record.id,
          template: record.templateName || record.templateId || 'Data Record',
          template_id: record.templateId,
          is_flexible: !!record.isFlexible,
          count: childEntries.length,
          data: baseFieldValues,
          table_rows: record.tableRows && record.tableRows.length > 0 ? record.tableRows : undefined,
          entries: childEntries.map((e) => ({
            id: e.id,
            entry_number: e.entryNumber,
            title: e.title,
            data:
              e.fieldValues ||
              (e.flexibleFields
                ? e.flexibleFields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {})
                : {}),
            table_rows: e.tableRows && e.tableRows.length > 0 ? e.tableRows : undefined,
            raw_transcript: e.rawTranscript || undefined,
            created_at: e.createdAt,
          })),
          raw_transcript: record.rawTranscript || undefined,
          created_at: record.createdAt,
          date: record.date,
        });
      }

      // Single entry / legacy record
      const singleData = childEntries.length === 1 && childEntries[0].fieldValues
        ? childEntries[0].fieldValues
        : baseFieldValues;

      const singleTableRows = childEntries.length === 1 && childEntries[0].tableRows
        ? childEntries[0].tableRows
        : record.tableRows;

      return NextResponse.json({
        id: record.id,
        template: record.templateName || record.templateId || 'Data Record',
        template_id: record.templateId,
        is_flexible: !!record.isFlexible,
        data: singleData,
        table_rows: singleTableRows && singleTableRows.length > 0 ? singleTableRows : undefined,
        raw_transcript: record.rawTranscript || undefined,
        created_at: record.createdAt,
        date: record.date,
      });
    }

    // 3. Check if ID matches a child entry within any parent record
    const allRecords = await dbDataEntries.getAll();
    for (const parent of allRecords) {
      if (parent.entries && Array.isArray(parent.entries)) {
        const matchingChild = parent.entries.find((e) => e.id === decodedId);
        if (matchingChild) {
          const childData =
            matchingChild.fieldValues ||
            (matchingChild.flexibleFields
              ? matchingChild.flexibleFields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {})
              : {});

          return NextResponse.json({
            id: matchingChild.id,
            parent_record_id: parent.id,
            template: matchingChild.templateName || parent.templateName || parent.templateId || 'Data Record',
            template_id: matchingChild.templateId || parent.templateId,
            data: childData,
            table_rows: matchingChild.tableRows && matchingChild.tableRows.length > 0 ? matchingChild.tableRows : undefined,
            raw_transcript: matchingChild.rawTranscript || undefined,
            created_at: matchingChild.createdAt || parent.createdAt,
            date: parent.date,
          });
        }
      }
    }

    return NextResponse.json(
      { error: `Record not found with ID: "${decodedId}"` },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('❌ [/api/history/[id] error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch history record.' },
      { status: 500 }
    );
  }
}
