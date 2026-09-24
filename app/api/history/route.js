import { NextResponse } from 'next/server';
import { getMatchHistory } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');
    const history = await getMatchHistory(bookId);
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
