import { NextResponse } from 'next/server';
import { getBook, saveMatchHistory } from '@/lib/sampleData';
import { matchNotesToBook } from '@/lib/searchEngine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { bookId, notesText, geminiApiKey } = await req.json();

    if (!notesText || !notesText.trim()) {
      return NextResponse.json({ error: 'Notes text cannot be empty' }, { status: 400 });
    }

    const book = await getBook(bookId);
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const results = await matchNotesToBook(book, notesText.trim(), geminiApiKey);

    // Save session to MongoDB / Memory history
    try {
      await saveMatchHistory({
        ...results,
        notesSnippet: notesText.slice(0, 200).replace(/\n+/g, ' ')
      });
    } catch (saveErr) {
      console.warn('Could not save match history:', saveErr.message);
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('Error in /api/match:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
