import { NextRequest, NextResponse } from 'next/server';
import { dbTemplates, dbDataEntries } from '@/lib/db/models';
import { GroqServer } from '@/lib/groq/groqServer';
import { validateApiRequest, unauthorizedResponse } from '@/lib/api/auth';
import { findTemplateBySlugOrId } from '@/lib/api/templateHelper';
import { getTodayString } from '@/lib/utils/dateUtils';
import { DataTemplate } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const authResult = validateApiRequest(req);
    if (!authResult.authorized) {
      return unauthorizedResponse(authResult);
    }

    const contentType = req.headers.get('content-type') || '';
    const customKey = req.headers.get('x-custom-groq-key');
    const { searchParams } = new URL(req.url);
    const shouldSave = searchParams.get('save') === 'true';

    let audioBlob: Blob | File | null = null;
    let templateIdentifier: string | null = null;
    let directTranscript: string | null = null;
    let filename = 'audio_recording.webm';

    // 2. Parse Multipart/form-data or JSON
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      audioBlob = (formData.get('audio') || formData.get('file') || formData.get('audio_file')) as Blob | null;
      templateIdentifier = (formData.get('template') || formData.get('template_id') || formData.get('template_name')) as string | null;
      directTranscript = formData.get('transcript') as string | null;

      if (audioBlob instanceof File && audioBlob.name) {
        filename = audioBlob.name;
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      templateIdentifier = body.template || body.template_id || body.template_name;
      directTranscript = body.transcript || body.text;

      if (body.audio_base64) {
        const buffer = Buffer.from(body.audio_base64, 'base64');
        audioBlob = new Blob([buffer], { type: body.mime_type || 'audio/webm' });
        filename = body.filename || 'audio.webm';
      }
    } else {
      return NextResponse.json(
        {
          error: 'Invalid Content-Type. Please use "multipart/form-data" with "audio" and "template" fields.',
        },
        { status: 400 }
      );
    }

    // 3. Validate template presence
    if (!templateIdentifier) {
      const allTemplates = await dbTemplates.getAll();
      return NextResponse.json(
        {
          error: 'Template identifier is required (provide "template" with template name or id).',
          available_templates: allTemplates.map((t) => ({ id: t.id, name: t.name })),
        },
        { status: 400 }
      );
    }

    // 4. Resolve template schema
    const allTemplates = await dbTemplates.getAll();
    const allRecords = await dbDataEntries.getAll();
    const matchedTemplate = findTemplateBySlugOrId(templateIdentifier, allTemplates, allRecords);

    if (!matchedTemplate) {
      return NextResponse.json(
        {
          error: `Template "${templateIdentifier}" not found.`,
          available_templates: allTemplates.map((t) => ({ id: t.id, name: t.name })),
        },
        { status: 400 }
      );
    }

    // 5. Obtain transcription (via Whisper AI transcription or direct transcript)
    let transcript = directTranscript?.trim() || '';

    if (!transcript) {
      if (!audioBlob) {
        return NextResponse.json(
          { error: 'Audio file is required in "audio" or "file" form-data parameter.' },
          { status: 400 }
        );
      }

      transcript = await GroqServer.transcribeAudio(audioBlob, filename, customKey);
      if (!transcript || transcript.trim() === '') {
        return NextResponse.json(
          { error: 'Transcription resulted in empty text. Please verify audio clarity.' },
          { status: 422 }
        );
      }
    }

    // 6. Execute Voice-to-Data extraction pipeline reusing GroqServer
    const isFlexible = matchedTemplate.id === 'flexible';

    if (isFlexible) {
      const flexResult = await GroqServer.extractFlexibleData(transcript, customKey);
      const fieldValues = (flexResult.fields || []).reduce(
        (acc: Record<string, any>, f) => ({ ...acc, [f.name]: f.value }),
        {}
      );

      let savedRecordId: string | undefined = undefined;
      if (shouldSave) {
        const created = await dbDataEntries.create({
          templateId: 'flexible',
          templateName: flexResult.title || 'Flexible Voice Record',
          isFlexible: true,
          title: flexResult.title || 'Flexible Voice Record',
          fieldValues,
          flexibleFields: flexResult.fields,
          tableTitle: flexResult.table?.title || 'Detected Data Table',
          tableHeaders: flexResult.table?.headers || [],
          tableRows: flexResult.table?.rows || [],
          rawTranscript: transcript,
          date: getTodayString(),
        });
        savedRecordId = created.id;
      }

      return NextResponse.json({
        template: 'flexible',
        template_id: 'flexible',
        ...(savedRecordId ? { id: savedRecordId } : {}),
        data: fieldValues,
        fields: flexResult.fields || [],
        table: flexResult.table,
        raw_transcript: transcript,
      });
    }

    // Template-based extraction
    const extracted = await GroqServer.extractCustomData(
      transcript,
      matchedTemplate as DataTemplate,
      customKey
    );

    let savedRecordId: string | undefined = undefined;
    if (shouldSave) {
      const created = await dbDataEntries.create({
        templateId: matchedTemplate.id,
        templateName: matchedTemplate.name,
        isFlexible: false,
        title: matchedTemplate.name,
        fieldValues: extracted.fieldValues || {},
        tableTitle: matchedTemplate.tableTitle || 'Repeated Entries',
        tableHeaders: matchedTemplate.tableFields?.map((f) => f.name) || [],
        tableRows: extracted.tableRows || [],
        rawTranscript: transcript,
        date: getTodayString(),
      });
      savedRecordId = created.id;
    }

    return NextResponse.json({
      template: matchedTemplate.name,
      template_id: matchedTemplate.id,
      ...(savedRecordId ? { id: savedRecordId } : {}),
      data: extracted.fieldValues || {},
      table_rows: extracted.tableRows && extracted.tableRows.length > 0 ? extracted.tableRows : undefined,
      raw_transcript: transcript,
      ...(extracted.lookupStatus ? { lookup_status: extracted.lookupStatus } : {}),
      ...(extracted.invalidLookup ? { invalid_lookup: extracted.invalidLookup, invalid_lookup_message: extracted.invalidLookupMessage } : {}),
    });
  } catch (error: any) {
    console.error('❌ [/api/voice-to-data error]:', error);
    return NextResponse.json(
      { error: error.message || 'Voice-to-Data processing failed.' },
      { status: 500 }
    );
  }
}
