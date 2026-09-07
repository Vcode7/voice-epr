import { NextRequest, NextResponse } from 'next/server';
import { dbCompanies } from '@/lib/db/models';

export async function GET() {
  try {
    const companies = await dbCompanies.getAll();
    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch companies.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.gstin || !body.address || !body.city || !body.state) {
      return NextResponse.json(
        { error: 'Company Name, GSTIN, Address, City, and State are required.' },
        { status: 400 }
      );
    }
    const created = await dbCompanies.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create company.' }, { status: 500 });
  }
}
