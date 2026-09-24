import MiniSearch from 'minisearch';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
  'to', 'for', 'of', 'with', 'by', 'how', 'does', 'what', 'why', 'when', 'which',
  'who', 'work', 'works', 'can', 'from', 'this', 'that', 'these', 'those', 'about',
  'into', 'through', 'over', 'under', 'between', 'during', 'then', 'than', 'each'
]);

function stem(word) {
  let w = word.toLowerCase();
  for (const s of ['ing', 'tion', 'tions', 'ed', 'es', 's']) {
    if (w.length > s.length + 3 && w.endsWith(s)) {
      return w.slice(0, -s.length);
    }
  }
  return w;
}

function extractTokens(text) {
  const words = (text || '').match(/\b[A-Za-z0-9_]{3,}\b/g) || [];
  return words
    .filter(w => !STOP_WORDS.has(w.toLowerCase()))
    .map(w => stem(w));
}

// In-memory index cache per book
const indexCache = new Map();

export function getOrBuildBookIndex(book) {
  if (indexCache.has(book.id)) {
    return indexCache.get(book.id);
  }

  const ms = new MiniSearch({
    fields: ['title', 'text'],
    storeFields: ['pageNumber', 'title'],
    searchOptions: {
      boost: { title: 2.5 },
      fuzzy: 0.2,
      prefix: true
    }
  });

  const docs = book.pages.map(p => ({
    id: p.pageNumber,
    pageNumber: p.pageNumber,
    title: p.title || `Page ${p.pageNumber}`,
    text: p.lines.map(l => l.text).join(' ')
  }));

  ms.addAll(docs);
  indexCache.set(book.id, ms);
  return ms;
}

export function segmentNotes(notesText) {
  const lines = (notesText || '').split('\n');
  const segmented = [];
  let currentTopic = 'General Lecture Notes';
  let lineId = 1;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (
      trimmed.startsWith('#') ||
      trimmed.toLowerCase().startsWith('lecture:') ||
      trimmed.toLowerCase().startsWith('slide:') ||
      trimmed.toLowerCase().startsWith('topic:') ||
      trimmed.toLowerCase().startsWith('chapter:') ||
      trimmed.toLowerCase().startsWith('module:')
    ) {
      currentTopic = trimmed.replace(/^[#\-\=\:\s]+/, '').trim();
      continue;
    }

    const cleaned = trimmed.replace(/^[\*\-\•\>\d+\.\)]+\s*/, '').trim();
    if (cleaned.length < 5) continue;

    segmented.push({
      id: lineId++,
      rawLine: trimmed,
      cleanedText: cleaned,
      topic: currentTopic
    });
  }

  return segmented;
}

export function localPinpointLines(page, queryText) {
  const qTokens = extractTokens(queryText);
  const qSet = new Set(qTokens);

  const wordsRaw = (queryText.toLowerCase().match(/\b[A-Za-z0-9_]{3,}\b/g) || []);
  const bigrams = new Set();
  for (let i = 0; i < wordsRaw.length - 1; i++) {
    bigrams.add(`${wordsRaw[i]} ${wordsRaw[i+1]}`);
  }

  const lines = page.lines || [];
  let best = {
    startLine: 1,
    endLine: 1,
    exactQuote: lines[0] ? lines[0].text : '',
    confidence: 45,
    explanation: `Aligns with page ${page.pageNumber} concepts.`
  };
  let highestScore = -1;

  for (let windowSize = 1; windowSize <= Math.min(5, lines.length); windowSize++) {
    for (let i = 0; i <= lines.length - windowSize; i++) {
      const windowLines = lines.slice(i, i + windowSize);
      const combinedText = windowLines.map(l => l.text).join(' ');

      if (combinedText.length < 15) continue;

      const wTokens = extractTokens(combinedText);
      const overlap = wTokens.filter(t => qSet.has(t));
      if (overlap.length === 0) continue;

      const coverage = overlap.length / Math.max(1, qSet.size);
      const density = overlap.length / wTokens.length;

      let bigramBonus = 0;
      const lowerComb = combinedText.toLowerCase();
      for (const bg of bigrams) {
        if (lowerComb.includes(bg)) bigramBonus += 0.35;
      }

      const score = (coverage * 0.6) + (density * 0.2) + (bigramBonus * 0.2);

      if (score > highestScore) {
        highestScore = score;
        const matchedTerms = Array.from(new Set(overlap)).slice(0, 4);
        best = {
          startLine: windowLines[0].lineNumber,
          endLine: windowLines[windowLines.length - 1].lineNumber,
          exactQuote: combinedText,
          confidence: Math.min(99, Math.max(52, Math.round(score * 120))),
          explanation: `Textbook page directly discusses (${matchedTerms.join(', ')}) matching your lecture note.`
        };
      }
    }
  }

  return best;
}

async function callGeminiExplanation(query, pageExcerpt, pageNumber, apiKey) {
  if (!apiKey) return null;
  try {
    const prompt = `You are an academic textbook locator assistant.
Class Note / Question: "${query}"
Textbook Page ${pageNumber} Excerpt: "${pageExcerpt}"

Provide a 1-sentence concise study takeaway explaining why studying this specific page and passage directly addresses the student's lecture note.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.2 }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    }
  } catch (err) {
    console.warn('Gemini explanation call skipped:', err.message);
  }
  return null;
}

export async function findExactPageForQuery(book, query, geminiApiKey = null) {
  const ms = getOrBuildBookIndex(book);
  const searchResults = ms.search(query, { fuzzy: 0.2, prefix: true });

  const topPageNum = searchResults.length > 0 ? searchResults[0].pageNumber : (book.pages[0]?.pageNumber || 1);
  const topPage = book.pages.find(p => p.pageNumber === topPageNum) || book.pages[0];

  const pinpoint = localPinpointLines(topPage, query);

  const altPages = searchResults
    .slice(1, 4)
    .filter(r => r.pageNumber !== topPageNum)
    .map(r => ({
      pageNumber: r.pageNumber,
      title: r.title
    }));

  const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (effectiveKey) {
    const aiExplanation = await callGeminiExplanation(query, pinpoint.exactQuote, topPage.pageNumber, effectiveKey);
    if (aiExplanation) {
      pinpoint.explanation = `✨ AI Analysis: ${aiExplanation}`;
    }
  }

  return {
    bookId: book.id,
    bookTitle: book.title,
    totalPages: book.totalPages,
    query,
    exactPage: topPage.pageNumber,
    startLine: pinpoint.startLine,
    endLine: pinpoint.endLine,
    sectionTitle: topPage.title,
    exactQuote: pinpoint.exactQuote,
    confidence: pinpoint.confidence,
    explanation: pinpoint.explanation,
    alternativePages: altPages
  };
}

export async function matchNotesToBook(book, notesText, geminiApiKey = null) {
  const noteLines = segmentNotes(notesText);
  if (noteLines.length === 0) {
    throw new Error('No recognizable note lines found. Please input your notes or bullet points.');
  }

  const ms = getOrBuildBookIndex(book);
  const matches = [];
  const uniquePages = new Set();
  const pagesMap = new Map(book.pages.map(p => [p.pageNumber, p]));

  for (const item of noteLines) {
    const q = `${item.topic} ${item.cleanedText}`;
    const searchResults = ms.search(q, { fuzzy: 0.2, prefix: true });
    const targetPageNum = searchResults.length > 0 ? searchResults[0].pageNumber : 1;
    const page = pagesMap.get(targetPageNum) || book.pages[0];

    const pinpoint = localPinpointLines(page, item.cleanedText);
    uniquePages.add(page.pageNumber);

    matches.push({
      lineId: item.id,
      topic: item.topic,
      noteLine: item.cleanedText,
      rawNote: item.rawLine,
      pageNumber: page.pageNumber,
      sectionTitle: page.title,
      startLine: pinpoint.startLine,
      endLine: pinpoint.endLine,
      exactQuote: pinpoint.exactQuote,
      confidence: pinpoint.confidence,
      explanation: pinpoint.explanation
    });
  }

  const sortedUniquePages = Array.from(uniquePages).sort((a, b) => a - b);
  const readingRanges = [];
  if (sortedUniquePages.length > 0) {
    let rangeStart = sortedUniquePages[0];
    let prev = sortedUniquePages[0];

    for (let i = 1; i < sortedUniquePages.length; i++) {
      const p = sortedUniquePages[i];
      if (p === prev + 1) {
        prev = p;
      } else {
        readingRanges.push({ start: rangeStart, end: prev, count: prev - rangeStart + 1 });
        rangeStart = p;
        prev = p;
      }
    }
    readingRanges.push({ start: rangeStart, end: prev, count: prev - rangeStart + 1 });
  }

  const pagesToRead = sortedUniquePages.length;
  const timeSavedPercent = Math.max(0, Math.round((1 - pagesToRead / Math.max(1, book.totalPages)) * 1000) / 10);

  // Group matches by Page Number for streamlined study sequence
  const pageClusters = {};
  for (const m of matches) {
    if (!pageClusters[m.pageNumber]) {
      pageClusters[m.pageNumber] = {
        pageNumber: m.pageNumber,
        sectionTitle: m.sectionTitle,
        topics: new Set(),
        matchedPointsCount: 0,
        snippets: []
      };
    }
    pageClusters[m.pageNumber].topics.add(m.topic);
    pageClusters[m.pageNumber].matchedPointsCount++;
    pageClusters[m.pageNumber].snippets.push({
      noteLine: m.noteLine,
      lines: `${m.startLine}–${m.endLine}`,
      exactQuote: m.exactQuote
    });
  }

  const pageClustersList = Object.values(pageClusters).map(cluster => ({
    ...cluster,
    topics: Array.from(cluster.topics)
  })).sort((a, b) => a.pageNumber - b.pageNumber);

  return {
    bookId: book.id,
    bookTitle: book.title,
    totalBookPages: book.totalPages,
    notesLineCount: noteLines.length,
    pagesToReadCount: pagesToRead,
    timeSavedPercent,
    uniquePages: sortedUniquePages,
    readingRanges,
    pageClusters: pageClustersList,
    matches
  };
}
