import { NextResponse } from 'next/server';
import { getBook } from '@/lib/sampleData';
import { matchNotesToBook } from '@/lib/searchEngine';

export async function POST(req) {
  try {
    const { bookId, notesText, geminiApiKey } = await req.json();

    if (!notesText || !notesText.trim()) {
      return NextResponse.json({ error: 'Notes text cannot be empty' }, { status: 400 });
    }

    const book = getBook(bookId);
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const results = await matchNotesToBook(book, notesText.trim(), geminiApiKey);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
