import { NextResponse } from 'next/server';
import { parseLectureSlidesPdf } from '@/lib/pdfProcessor';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await parseLectureSlidesPdf(buffer);

    return NextResponse.json({
      filename: file.name,
      totalSlides: result.totalSlides,
      extractedNotes: result.extractedNotes
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
