import { NextResponse } from 'next/server';
import { seedDemoDataToDb } from '@/lib/db/seedData';

export async function POST() {
  try {
    const stats = await seedDemoDataToDb();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
