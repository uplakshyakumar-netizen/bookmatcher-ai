import { NextResponse } from 'next/server';
import { initDefaultSampleBook, SAMPLE_NOTES, getAllBooks } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function GET() {
  const book = initDefaultSampleBook();
  const all = await getAllBooks();
  return NextResponse.json({
    book,
    allBooks: all,
    sampleNotes: SAMPLE_NOTES
  });
}

export async function POST() {
  const book = initDefaultSampleBook();
  const all = await getAllBooks();
  return NextResponse.json({
    book,
    allBooks: all,
    sampleNotes: SAMPLE_NOTES
  });
}
