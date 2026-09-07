import { NextRequest, NextResponse } from 'next/server';
import { dbVouchers } from '@/lib/db/models';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const voucher = await dbVouchers.getById(id);
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found.' }, { status: 404 });
    }
    return NextResponse.json(voucher);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch voucher.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const updated = await dbVouchers.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Voucher not found.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update voucher.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await dbVouchers.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Voucher not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Voucher deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete voucher.' }, { status: 500 });
  }
}
