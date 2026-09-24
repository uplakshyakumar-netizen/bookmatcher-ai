import { NextResponse } from 'next/server';
import { getDbStatus } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getDbStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({
      connected: false,
      reason: err.message
    });
  }
}
