import { NextRequest, NextResponse } from 'next/server';
import { dbItems } from '@/lib/db/models';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await dbItems.getById(id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch item.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const updated = await dbItems.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update item.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await dbItems.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Item deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete item.' }, { status: 500 });
  }
}
