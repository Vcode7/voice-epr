import { NextRequest, NextResponse } from 'next/server';
import { dbDataEntries } from '@/lib/db/models';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('templateId');
    const search = searchParams.get('search')?.toLowerCase();

    let list = await dbDataEntries.getAll();

    if (templateId && templateId !== 'All') {
      if (templateId === 'flexible') {
        list = list.filter((e) => e.isFlexible || e.templateId === 'flexible' || !!e.flexibleFields);
      } else {
        list = list.filter((e) => e.templateId === templateId);
      }
    }

    if (search) {
      list = list.filter((e) => {
        const matchesName = (e.title || e.templateName || '').toLowerCase().includes(search);
        const matchesTranscript = (e.rawTranscript || '').toLowerCase().includes(search);
        const matchesDate = e.date.toLowerCase().includes(search);
        const matchesFieldValues = Object.values(e.fieldValues || {}).some((v) =>
          String(v).toLowerCase().includes(search)
        );
        const matchesFlexFields = (e.flexibleFields || []).some(
          (f) => f.name.toLowerCase().includes(search) || String(f.value).toLowerCase().includes(search)
        );
        return matchesName || matchesTranscript || matchesDate || matchesFieldValues || matchesFlexFields;
      });
    }

    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const created = await dbDataEntries.createMany(body);
      return NextResponse.json(created, { status: 201 });
    }

    const created = await dbDataEntries.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
