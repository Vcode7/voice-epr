import { NextRequest, NextResponse } from 'next/server';
import { dbPrescriptions } from '@/lib/db/models';

export async function GET() {
  try {
    const prescriptions = await dbPrescriptions.getAll();
    return NextResponse.json(prescriptions);
  } catch (error: any) {
    console.error('❌ [/api/prescriptions GET error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prescriptions.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.patientName) {
      return NextResponse.json(
        { error: 'Patient Name is required.' },
        { status: 400 }
      );
    }

    const created = await dbPrescriptions.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('❌ [/api/prescriptions POST error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save prescription.' },
      { status: 500 }
    );
  }
}
