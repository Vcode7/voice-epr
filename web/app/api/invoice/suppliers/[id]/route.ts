import { NextRequest, NextResponse } from 'next/server';
import { dbSuppliers } from '@/lib/db/models';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await dbSuppliers.getById(id);
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    }
    return NextResponse.json(supplier);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch supplier.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const updated = await dbSuppliers.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update supplier.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await dbSuppliers.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete supplier.' }, { status: 500 });
  }
}
