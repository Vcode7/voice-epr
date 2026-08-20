import { NextRequest, NextResponse } from 'next/server';
import { dbTemplates } from '@/lib/db/models';

export async function GET() {
  try {
    const list = await dbTemplates.getAll();
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const template = await req.json();
    if (!template.id || !template.name) {
      return NextResponse.json({ error: 'Template id and name are required' }, { status: 400 });
    }
    const saved = await dbTemplates.save(template);
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
