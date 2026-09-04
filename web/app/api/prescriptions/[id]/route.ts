import { NextRequest, NextResponse } from 'next/server';
import { dbPrescriptions } from '@/lib/db/models';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prescription = await dbPrescriptions.getById(id);
    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 });
    }
    return NextResponse.json(prescription);
  } catch (error: any) {
    console.error('❌ [/api/prescriptions/[id] GET error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prescription.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await dbPrescriptions.update(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('❌ [/api/prescriptions/[id] PUT error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update prescription.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await dbPrescriptions.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ [/api/prescriptions/[id] DELETE error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete prescription.' },
      { status: 500 }
    );
  }
}
