import { NextResponse } from 'next/server';
import { getAllBooks, getBook } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('id');

    if (bookId) {
      const book = await getBook(bookId);
      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }
      return NextResponse.json({ book });
    }

    const books = await getAllBooks();
    return NextResponse.json({ books });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
