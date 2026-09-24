import pdf from 'pdf-parse';

export function fixSpacedText(text) {
  if (!text) return '';
  // Fix kerning/letter-spacing artifacts in PDFs (e.g. "S o r t i n g" -> "Sorting", "O R D E R" -> "ORDER")
  return text.split(/\s{2,}/).map(wordChunk => {
    const tokens = wordChunk.trim().split(/\s+/);
    // If chunk is predominantly single letters (e.g. 'P', 'a', 't', 't', 'e', 'r', 'n')
    if (tokens.length > 1 && tokens.filter(t => t.length === 1).length >= tokens.length * 0.65) {
      return tokens.join('');
    }
    return wordChunk;
  }).join(' ').replace(/\s+/g, ' ').trim();
}

export async function parsePdfToPages(buffer) {
  let pageIndex = 1;
  const pages = [];

  function customPageRender(pageData) {
    return pageData.getTextContent().then(textContent => {
      let lastY;
      const lines = [];
      let currentLine = '';
      let lineNum = 1;

      for (const item of textContent.items) {
        const y = item.transform ? item.transform[5] : undefined;
        // Group items that share approximately the same Y baseline (+/- 3px tolerance)
        if (lastY === undefined || (y !== undefined && Math.abs(lastY - y) <= 3)) {
          if (item.str) currentLine += item.str + ' ';
        } else {
          const cleaned = fixSpacedText(currentLine);
          if (cleaned && cleaned.length > 0) {
            lines.push({
              lineNumber: lineNum++,
              text: cleaned
            });
          }
          currentLine = (item.str || '') + ' ';
        }
        if (y !== undefined) lastY = y;
      }

      const cleanedLast = fixSpacedText(currentLine);
      if (cleanedLast && cleanedLast.length > 0) {
        lines.push({
          lineNumber: lineNum++,
          text: cleanedLast
        });
      }

      // First descriptive line often serves as page title
      const titleCandidate = lines.find(l => l.text.length > 2 && l.text.length < 80);
      const title = titleCandidate ? titleCandidate.text : `Page ${pageIndex}`;

      pages.push({
        pageNumber: pageIndex++,
        title,
        lines: lines.length > 0 ? lines : [{ lineNumber: 1, text: `Page ${pageIndex - 1}` }]
      });

      return lines.map(l => l.text).join('\n');
    });
  }

  await pdf(buffer, { pagerender: customPageRender });
  return pages;
}

export async function parseLectureSlidesPdf(buffer) {
  let slideIndex = 1;
  const slideSections = [];

  function customSlideRender(pageData) {
    return pageData.getTextContent().then(textContent => {
      let lastY;
      const lines = [];
      let currentLine = '';

      for (const item of textContent.items) {
        const y = item.transform ? item.transform[5] : undefined;
        if (lastY === undefined || (y !== undefined && Math.abs(lastY - y) <= 3)) {
          if (item.str) currentLine += item.str + ' ';
        } else {
          const cleaned = fixSpacedText(currentLine);
          if (cleaned) lines.push(cleaned);
          currentLine = (item.str || '') + ' ';
        }
        if (y !== undefined) lastY = y;
      }
      const cleanedLast = fixSpacedText(currentLine);
      if (cleanedLast) lines.push(cleanedLast);

      let slideTitle = `Slide ${slideIndex}`;
      let content = lines;

      if (lines.length > 0 && lines[0].length < 75) {
        slideTitle = `Slide ${slideIndex}: ${lines[0]}`;
        content = lines.slice(1);
      }

      const formattedPoints = content
        .filter(c => c.length > 3)
        .map(c => {
          const stripped = c.replace(/^[\*\-\•\>\d+\.\)]+\s*/, '');
          return `* ${stripped}`;
        });

      slideSections.push(`# ${slideTitle}\n` + formattedPoints.join('\n'));
      slideIndex++;
      return lines.join('\n');
    });
  }

  await pdf(buffer, { pagerender: customSlideRender });
  return {
    totalSlides: slideSections.length,
    extractedNotes: slideSections.join('\n\n')
  };
}
