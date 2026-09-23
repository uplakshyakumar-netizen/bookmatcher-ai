import pdf from 'pdf-parse';

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
        if (lastY === item.transform[5] || lastY === undefined) {
          currentLine += item.str + ' ';
        } else {
          if (currentLine.trim()) {
            lines.push({
              lineNumber: lineNum++,
              text: currentLine.trim()
            });
          }
          currentLine = item.str + ' ';
        }
        lastY = item.transform[5];
      }

      if (currentLine.trim()) {
        lines.push({
          lineNumber: lineNum++,
          text: currentLine.trim()
        });
      }

      // First line often serves as page title
      const title = lines.length > 0 && lines[0].text.length < 80 
        ? lines[0].text 
        : `Page ${pageIndex}`;

      pages.push({
        pageNumber: pageIndex++,
        title,
        lines
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
        if (lastY === item.transform[5] || lastY === undefined) {
          currentLine += item.str + ' ';
        } else {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = item.str + ' ';
        }
        lastY = item.transform[5];
      }
      if (currentLine.trim()) lines.push(currentLine.trim());

      let slideTitle = `Slide ${slideIndex}`;
      let content = lines;

      if (lines.length > 0 && lines[0].length < 75) {
        slideTitle = `Slide ${slideIndex}: ${lines[0]}`;
        content = lines.slice(1);
      }

      const formattedPoints = content
        .filter(c => c.length > 4)
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
