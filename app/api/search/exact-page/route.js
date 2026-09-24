import { NextResponse } from 'next/server';
import { getBook } from '@/lib/sampleData';
import { findExactPageForQuery } from '@/lib/searchEngine';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { bookId, query, geminiApiKey } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query cannot be empty' }, { status: 400 });
    }

    const book = await getBook(bookId);
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const result = await findExactPageForQuery(book, query.trim(), geminiApiKey);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
