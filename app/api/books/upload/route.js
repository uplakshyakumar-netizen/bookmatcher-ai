import { NextResponse } from 'next/server';
import { parsePdfToPages } from '@/lib/pdfProcessor';
import { saveBook, getAllBooks } from '@/lib/sampleData';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const title = formData.get('title') || file.name.replace(/\.pdf$/i, '');

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pages = await parsePdfToPages(buffer);
    const bookId = `book_${Date.now()}`;

    const newBook = {
      id: bookId,
      title: title.trim(),
      totalPages: pages.length,
      toc: pages.filter((p, i) => i % 5 === 0).map(p => ({ level: 1, title: p.title, page: p.pageNumber })),
      pages
    };

    saveBook(newBook);
    const all = getAllBooks();

    return NextResponse.json({
      message: 'Textbook indexed successfully',
      book: newBook,
      allBooks: all
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
