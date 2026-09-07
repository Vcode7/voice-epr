import { NextRequest, NextResponse } from 'next/server';
import { dbCustomers } from '@/lib/db/models';

export async function GET() {
  try {
    const customers = await dbCustomers.getAll();
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch customers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.address || !body.city || !body.state) {
      return NextResponse.json(
        { error: 'Customer Name, Address, City, and State are required.' },
        { status: 400 }
      );
    }
    const created = await dbCustomers.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create customer.' }, { status: 500 });
  }
}
