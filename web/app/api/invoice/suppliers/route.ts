import { NextRequest, NextResponse } from 'next/server';
import { dbSuppliers } from '@/lib/db/models';

export async function GET() {
  try {
    const suppliers = await dbSuppliers.getAll();
    return NextResponse.json(suppliers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch suppliers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.address || !body.city || !body.state) {
      return NextResponse.json(
        { error: 'Supplier Name, Address, City, and State are required.' },
        { status: 400 }
      );
    }
    const created = await dbSuppliers.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create supplier.' }, { status: 500 });
  }
}
