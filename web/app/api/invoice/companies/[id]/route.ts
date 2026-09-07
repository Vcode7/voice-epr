import { NextRequest, NextResponse } from 'next/server';
import { dbCompanies } from '@/lib/db/models';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = await dbCompanies.getById(id);
    if (!company) {
      return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
    }
    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch company.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const updated = await dbCompanies.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update company.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await dbCompanies.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Company not found or cannot delete.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Company deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete company.' }, { status: 500 });
  }
}
