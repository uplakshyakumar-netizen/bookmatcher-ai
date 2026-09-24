import { NextResponse } from 'next/server';
import { parsePdfToPages } from '@/lib/pdfProcessor';
import { saveBook, getAllBooks } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const title = formData.get('title') || file?.name?.replace(/\.pdf$/i, '') || 'Uploaded Textbook';

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pages = await parsePdfToPages(buffer);
    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'Could not extract text from the PDF. It may be scanned or empty.' }, { status: 400 });
    }

    const bookId = `book_${Date.now()}`;

    const newBook = {
      id: bookId,
      title: title.trim(),
      totalPages: pages.length,
      toc: pages.filter((p, i) => i % 5 === 0 || i === 0).map(p => ({ level: 1, title: p.title, page: p.pageNumber })),
      pages
    };

    await saveBook(newBook);
    const all = await getAllBooks();

    return NextResponse.json({
      message: `Textbook indexed successfully (${pages.length} pages)`,
      book: {
        id: newBook.id,
        title: newBook.title,
        totalPages: newBook.totalPages,
        toc: newBook.toc
      },
      allBooks: all
    });
  } catch (err) {
    console.error('Error in /api/books/upload:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
