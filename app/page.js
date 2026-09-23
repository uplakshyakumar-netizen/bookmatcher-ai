'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpenCheck, Sparkles, Play, Book, Upload, Crosshair, FileText,
  Search, ArrowRightCircle, CheckCircle2, Maximize2, Eye, ChevronLeft,
  ChevronRight, FileUp, BookmarkCheck, Zap, ListChecks, BarChart3,
  CheckSquare, Download, X, Loader2
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('instant'); // 'instant' | 'batch'
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  
  // Instant search state
  const [instantQuery, setInstantQuery] = useState('');
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantResult, setInstantResult] = useState(null);
  const [viewerPageNum, setViewerPageNum] = useState(1);

  // Batch notes state
  const [notesText, setNotesText] = useState('');
  const [notesPdfBanner, setNotesPdfBanner] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [studiedPages, setStudiedPages] = useState(new Set());

  // Textbook upload state
  const [uploadProgress, setUploadProgress] = useState(null);

  // Modal reader state
  const [readerModal, setReaderModal] = useState({
    isOpen: false,
    pageNumber: 1,
    highlightLines: [],
    noteContext: '',
    pageData: null
  });

  // API Key modal
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Initial load
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    setGeminiApiKey(savedKey);

    const savedStudied = JSON.parse(localStorage.getItem('studied_pages') || '[]');
    setStudiedPages(new Set(savedStudied));

    loadDemoData();
  }, []);

  async function loadDemoData() {
    try {
      const res = await fetch('/api/demo');
      const data = await res.json();
      setBooks(data.allBooks || [data.book]);
      setActiveBook(data.book);
      setViewerPageNum(data.book.pages[0]?.pageNumber || 1);
    } catch (err) {
      console.error('Failed to load demo:', err);
    }
  }

  // 1-Click Demo
  async function handleQuickDemo() {
    setInstantLoading(true);
    try {
      const res = await fetch('/api/demo');
      const data = await res.json();
      setBooks(data.allBooks || [data.book]);
      setActiveBook(data.book);
      setNotesText(data.sampleNotes);

      const q = "How does page fault trapping work?";
      setInstantQuery(q);
      await executeInstantSearch(data.book.id, q);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setInstantLoading(false);
    }
  }

  // Instant Page Finder Search
  async function handleInstantSearchSubmit(e) {
    if (e) e.preventDefault();
    if (!instantQuery.trim() || !activeBook) return;
    setInstantLoading(true);
    await executeInstantSearch(activeBook.id, instantQuery.trim());
    setInstantLoading(false);
  }

  async function executeInstantSearch(bookId, q) {
    try {
      const res = await fetch('/api/search/exact-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, query: q, geminiApiKey })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Search failed');
      }
      const data = await res.json();
      setInstantResult(data);
      setViewerPageNum(data.exactPage);
    } catch (err) {
      alert('Search failed: ' + err.message);
    }
  }

  // Upload Notes PDF / Slides
  async function handleNotesPdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setNotesPdfBanner(`Parsing lecture slides from "${file.name}"...`);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/notes/extract-pdf', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to extract text');
      }
      const data = await res.json();
      setNotesText(data.extractedNotes);
      setNotesPdfBanner(`Successfully extracted ${data.totalSlides} slides from "${file.name}"!`);
      setActiveTab('batch');
    } catch (err) {
      setNotesPdfBanner('');
      alert('Error parsing notes PDF: ' + err.message);
    }
  }

  // Upload Textbook PDF (~1000 pages)
  async function handleTextbookUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(`Indexing "${file.name}" (~1,000 pages)...`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.pdf$/i, ''));

    try {
      const res = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      setBooks(data.allBooks);
      setActiveBook(data.book);
      setViewerPageNum(data.book.pages[0]?.pageNumber || 1);
      setUploadProgress(null);
      alert(`🎉 Successfully indexed "${data.book.title}" (${data.book.totalPages} pages)!`);
    } catch (err) {
      setUploadProgress(null);
      alert('Error indexing PDF: ' + err.message);
    }
  }

  // Batch Matching
  async function handleBatchMatching() {
    if (!notesText.trim() || !activeBook) return;
    setBatchLoading(true);

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: activeBook.id, notesText, geminiApiKey })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Matching failed');
      }
      const data = await res.json();
      setBatchResults(data);
    } catch (err) {
      alert('Matching error: ' + err.message);
    } finally {
      setBatchLoading(false);
    }
  }

  // Open Full Reader Modal
  function openReader(pageNumber, highlightLines = [], noteContext = '') {
    if (!activeBook) return;
    const pageData = activeBook.pages.find(p => p.pageNumber === pageNumber) || null;
    setReaderModal({
      isOpen: true,
      pageNumber,
      highlightLines,
      noteContext,
      pageData
    });
  }

  function navigateReader(delta) {
    if (!activeBook) return;
    const newPage = readerModal.pageNumber + delta;
    if (newPage >= 1 && newPage <= activeBook.totalPages) {
      const pageData = activeBook.pages.find(p => p.pageNumber === newPage) || null;
      setReaderModal(prev => ({
        ...prev,
        pageNumber: newPage,
        highlightLines: [],
        pageData
      }));
    }
  }

  function togglePageStudied(pageNum) {
    const updated = new Set(studiedPages);
    if (updated.has(pageNum)) {
      updated.delete(pageNum);
    } else {
      updated.add(pageNum);
    }
    setStudiedPages(updated);
    localStorage.setItem('studied_pages', JSON.stringify(Array.from(updated)));
  }

  // Export Guide
  function exportMarkdownGuide() {
    if (!batchResults) return;
    let md = `# Study Guide: ${batchResults.bookTitle}\n\n`;
    md += `**Target Pages to Read:** ${batchResults.pagesToReadCount} of ${batchResults.totalBookPages} pages (${batchResults.timeSavedPercent}% study time saved)\n\n`;
    md += `## Recommended Reading Sequence\n\n`;
    batchResults.readingRanges.forEach(r => {
      const label = r.start === r.end ? `Page ${r.start}` : `Pages ${r.start}–${r.end}`;
      md += `- [ ] **${label}** (${r.count} page${r.count > 1 ? 's' : ''})\n`;
    });
    md += `\n## Line-by-Line Classroom Notes Mapping\n\n`;
    batchResults.matches.forEach(m => {
      const lineSpan = m.startLine === m.endLine ? `Line ${m.startLine}` : `Lines ${m.startLine}–${m.endLine}`;
      md += `### ${m.topic}: "${m.noteLine}"\n`;
      md += `- **Location:** Page ${m.pageNumber}, ${lineSpan} (${m.confidence}% confidence)\n`;
      md += `- **Excerpt:** > "${m.exactQuote}"\n`;
      md += `- **Explanation:** ${m.explanation}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Study_Guide_${batchResults.bookTitle.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Active viewer page data
  const currentViewerPage = activeBook?.pages?.find(p => p.pageNumber === viewerPageNum) || null;
  const noteLinesTotal = notesText.split('\n').filter(l => l.trim().length > 3 && !l.trim().startsWith('#')).length;

  const filteredMatches = batchResults?.matches?.filter(m => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      m.noteLine.toLowerCase().includes(q) ||
      m.topic.toLowerCase().includes(q) ||
      m.exactQuote.toLowerCase().includes(q) ||
      `page ${m.pageNumber}`.includes(q)
    );
  }) || [];

  return (
    <div className="min-h-full flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">BookMatcher</span>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Next.js Fullstack
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Pinpoint Exact Textbook Pages & Lines from Notes (Node.js & React)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setApiKeyModalOpen(true)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                geminiApiKey ? 'border-amber-400 bg-amber-50/50 text-amber-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{geminiApiKey ? 'Gemini AI: Active' : 'Local Fast BM25'}</span>
            </button>

            <button 
              onClick={handleQuickDemo}
              disabled={instantLoading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 border border-indigo-200 transition shadow-sm">
              {instantLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-indigo-700" />}
              <span>1-Click Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Active Book Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Book className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  {activeBook ? activeBook.title : 'Loading Textbook...'}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  Active Book
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-indigo-600">
                  {activeBook ? `${activeBook.totalPages} Pages Indexed` : ''}
                </span>
                <span>•</span>
                <span>{activeBook?.toc ? `${activeBook.toc.length} Chapters & Sections` : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <select 
              value={activeBook?.id || ''}
              onChange={(e) => {
                const found = books.find(b => b.id === e.target.value);
                if (found) {
                  setActiveBook(found);
                  setViewerPageNum(found.pages?.[0]?.pageNumber || 1);
                }
              }}
              className="text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 max-w-xs">
              {books.map(b => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.totalPages} pages)
                </option>
              ))}
            </select>

            <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload ~1,000-Page PDF</span>
              <input type="file" accept=".pdf" onChange={handleTextbookUpload} className="hidden" />
            </label>
          </div>
        </div>

        {uploadProgress && (
          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-center space-x-2 text-xs text-indigo-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{uploadProgress}</span>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex items-center border-b border-slate-200 space-x-6 text-sm font-semibold">
          <button 
            onClick={() => setActiveTab('instant')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'instant' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            <Crosshair className="w-4 h-4" />
            <span>🎯 Instant Page Finder (Single Search)</span>
          </button>

          <button 
            onClick={() => setActiveTab('batch')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'batch' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            <FileText className="w-4 h-4" />
            <span>📚 Batch Class Notes (Paste or Upload PDF)</span>
          </button>
        </div>

        {/* TAB 1: Instant Page Finder */}
        {activeTab === 'instant' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-4">
              <div className="max-w-2xl space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Find the Exact Textbook Page to Read</h2>
                <p className="text-indigo-200 text-xs sm:text-sm">
                  Enter any concept, question, or single line from your lecture notes to instantly pinpoint the exact page and paragraph.
                </p>
              </div>

              <form onSubmit={handleInstantSearchSubmit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={instantQuery}
                    onChange={(e) => setInstantQuery(e.target.value)}
                    placeholder="e.g. How does page fault trapping work? or TLB hit penalty..." 
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-400/50 shadow-inner"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={instantLoading}
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-md transition active:scale-95 whitespace-nowrap disabled:opacity-50">
                  {instantLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightCircle className="w-4 h-4" />}
                  <span>Go to Exact Page</span>
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-indigo-300">Quick tests:</span>
                {[
                  "Page fault exception",
                  "Translation Lookaside Buffer (TLB)",
                  "Raft candidate state election timeout",
                  "Coffman deadlock conditions"
                ].map(q => (
                  <button 
                    key={q}
                    type="button"
                    onClick={() => {
                      setInstantQuery(q);
                      if (activeBook) executeInstantSearch(activeBook.id, q);
                    }}
                    className="text-xs bg-white/10 hover:bg-white/20 text-indigo-100 px-2.5 py-1 rounded-full transition">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Instant Search Result Card */}
            {instantResult && (
              <div className="bg-white rounded-2xl border-2 border-indigo-500/40 p-5 sm:p-6 shadow-md space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                      🎯 Exact Study Destination
                    </span>
                    <div className="flex items-baseline space-x-3 mt-2">
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        Turn to <span className="text-indigo-600 underline decoration-indigo-300">Page {instantResult.exactPage}</span>
                      </h3>
                      <span className="font-mono text-xs sm:text-sm font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                        {instantResult.startLine === instantResult.endLine 
                          ? `Line ${instantResult.startLine}` 
                          : `Lines ${instantResult.startLine}–${instantResult.endLine}`}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{instantResult.sectionTitle}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{instantResult.confidence}% Match</span>
                    </span>
                    <button 
                      onClick={() => openReader(
                        instantResult.exactPage, 
                        Array.from({ length: instantResult.endLine - instantResult.startLine + 1 }, (_, i) => instantResult.startLine + i),
                        instantResult.query
                      )}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Fullscreen View</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 space-y-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Book Excerpt</span>
                      <blockquote className="mt-1 font-mono text-xs text-slate-800 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 leading-relaxed">
                        “{instantResult.exactQuote}”
                      </blockquote>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Why Study This Page</span>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{instantResult.explanation}</p>
                    </div>

                    {instantResult.alternativePages?.length > 0 && (
                      <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-600">Other Related Pages:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {instantResult.alternativePages.map(alt => (
                            <button 
                              key={alt.pageNumber}
                              onClick={() => setViewerPageNum(alt.pageNumber)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 font-medium transition text-[11px]">
                              Page {alt.pageNumber} ({alt.title.substring(0, 22)}...)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Embedded Page Viewer with Line Highlighting */}
                  <div className="lg:col-span-7 bg-slate-100 rounded-xl p-3 border border-slate-200 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
                      <span className="font-semibold text-slate-700 flex items-center space-x-1">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Live Page View (Highlighted Lines)</span>
                      </span>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => setViewerPageNum(p => Math.max(1, p - 1))}
                          className="p-1 rounded hover:bg-slate-200">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-mono font-semibold px-1">Page {viewerPageNum}</span>
                        <button 
                          onClick={() => setViewerPageNum(p => Math.min(activeBook?.totalPages || 1, p + 1))}
                          className="p-1 rounded hover:bg-slate-200">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="w-full bg-white rounded-lg shadow-sm border border-slate-300 p-4 font-mono text-xs max-h-[500px] overflow-auto space-y-1">
                      {currentViewerPage?.lines?.map(l => {
                        const isHighlighted = viewerPageNum === instantResult.exactPage && 
                          l.lineNumber >= instantResult.startLine && 
                          l.lineNumber <= instantResult.endLine;
                        return (
                          <div 
                            key={l.lineNumber} 
                            className={`flex items-start py-0.5 px-2 rounded ${isHighlighted ? 'line-highlighted' : 'hover:bg-slate-50'}`}>
                            <span className="line-gutter">{l.lineNumber}</span>
                            <span className="flex-1 pl-3 text-slate-800 leading-relaxed">{l.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Batch Class Notes */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">2</span>
                  <h2 className="font-bold text-slate-900 text-sm">Upload Class Notes (PDF, Slide Deck, or Text)</h2>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition shadow-sm">
                    <FileUp className="w-4 h-4" />
                    <span>Upload Notes PDF / Slides</span>
                    <input type="file" accept=".pdf" onChange={handleNotesPdfUpload} className="hidden" />
                  </label>

                  <button 
                    onClick={async () => {
                      const res = await fetch('/api/demo');
                      const data = await res.json();
                      setNotesText(data.sampleNotes);
                      setNotesPdfBanner('');
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition">
                    Load Sample Notes
                  </button>

                  <button 
                    onClick={() => {
                      setNotesText('');
                      setNotesPdfBanner('');
                    }}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1.5 transition">
                    Clear
                  </button>
                </div>
              </div>

              {notesPdfBanner && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800">
                  <span>{notesPdfBanner}</span>
                  <span className="font-semibold text-emerald-700">Ready to Match</span>
                </div>
              )}

              <div className="relative">
                <textarea 
                  rows={8}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Paste your classroom notes here, or upload a notes PDF above..."
                  className="w-full p-3.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed bg-slate-50/50 resize-y"
                />
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                  <span><strong>{noteLinesTotal}</strong> instruction lines identified</span>
                  <span>Supports bullet points, headings (#), or slide headers</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Matches all notes lines to exact pages & lines</span>
                </span>

                <button 
                  onClick={handleBatchMatching}
                  disabled={batchLoading || !notesText.trim()}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-bold text-xs shadow-md shadow-indigo-200 transition active:scale-95 disabled:opacity-50">
                  {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Match All Class Notes</span>
                </button>
              </div>
            </div>

            {/* Batch Results */}
            {batchResults && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <BookmarkCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Pages to Study</p>
                      <div className="flex items-baseline space-x-2 mt-0.5">
                        <span className="text-2xl font-extrabold text-slate-900">{batchResults.pagesToReadCount}</span>
                        <span className="text-xs text-slate-400 font-medium">/ {batchResults.totalBookPages} total</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Study Time Saved</p>
                      <div className="flex items-baseline space-x-1 mt-0.5">
                        <span className="text-2xl font-extrabold text-indigo-600">{batchResults.timeSavedPercent}%</span>
                        <span className="text-xs text-emerald-600 font-semibold ml-1">Focused!</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                      <ListChecks className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Notes Lines Mapped</p>
                      <div className="flex items-baseline space-x-2 mt-0.5">
                        <span className="text-2xl font-extrabold text-slate-900">{batchResults.matches.length}</span>
                        <span className="text-xs text-slate-400 font-medium">lines pinpointed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Heatmap */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-bold text-sm text-slate-900">1,000-Page Distribution Heatmap</h3>
                    </div>
                    <span className="text-xs text-slate-400">Click any marker to open that page</span>
                  </div>

                  <div className="relative w-full h-8 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    {batchResults.uniquePages.map(pNum => {
                      const leftPercent = ((pNum - 1) / Math.max(1, batchResults.totalBookPages - 1)) * 100;
                      return (
                        <div 
                          key={pNum}
                          onClick={() => openReader(pNum, [], `Page ${pNum}`)}
                          style={{ left: `${Math.min(99.5, Math.max(0.5, leftPercent))}%` }}
                          title={`Page ${pNum}`}
                          className="heatmap-marker"
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Page 1</span>
                    <span>Page {Math.round(batchResults.totalBookPages / 2)}</span>
                    <span>Page {batchResults.totalBookPages}</span>
                  </div>
                </div>

                {/* Reading Ranges */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-sm text-slate-900">Consolidated Reading Checklist</h3>
                    </div>
                    <button 
                      onClick={exportMarkdownGuide}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 transition">
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Guide</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {batchResults.readingRanges.map((r, i) => {
                      const isStudied = Array.from({ length: r.count }, (_, idx) => r.start + idx).every(p => studiedPages.has(p));
                      const label = r.start === r.end ? `Page ${r.start}` : `Pages ${r.start}–${r.end}`;
                      return (
                        <button 
                          key={i}
                          onClick={() => openReader(r.start, [], `Range: ${label}`)}
                          className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                            isStudied ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50/50'
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${isStudied ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                          <span className="font-semibold">{label}</span>
                          <span className="text-[11px] text-slate-400">({r.count} pg{r.count > 1 ? 's' : ''})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Line Explorer */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Line-by-Line Note Pinpointer</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Every classroom note line mapped to its exact page, lines, and textbook passage</p>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input 
                        type="text" 
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        placeholder="Filter concepts..." 
                        className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredMatches.map(m => {
                      const isStudied = studiedPages.has(m.pageNumber);
                      const lineSpan = m.startLine === m.endLine ? `Line ${m.startLine}` : `Lines ${m.startLine}–${m.endLine}`;
                      return (
                        <div key={m.lineId} className={`p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-start gap-4 ${isStudied ? 'bg-emerald-50/20' : ''}`}>
                          <div className="pt-0.5">
                            <input 
                              type="checkbox" 
                              checked={isStudied}
                              onChange={() => togglePageStudied(m.pageNumber)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {m.topic}
                              </span>
                              <span className="text-xs text-slate-400">• Note Line {m.lineId}</span>
                            </div>

                            <div className="font-medium text-slate-900 text-xs sm:text-sm leading-relaxed">
                              "{m.noteLine}"
                            </div>

                            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200 flex items-center space-x-1">
                                    <Book className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Exact Page: {m.pageNumber}</span>
                                  </span>
                                  <span className="font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold text-[11px]">
                                    {lineSpan}
                                  </span>
                                  <span className="text-slate-500 text-[11px] font-medium hidden md:inline">
                                    ({m.sectionTitle})
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1 text-[11px] text-emerald-700 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{m.confidence}% Confidence</span>
                                </div>
                              </div>

                              <div className="font-mono text-[11px] text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-normal">
                                <span className="text-slate-400 select-none mr-1">“</span>{m.exactQuote}<span className="text-slate-400 select-none ml-1">”</span>
                              </div>

                              <p className="text-slate-600 text-[11px] leading-relaxed">
                                <strong className="text-slate-700">Why study this:</strong> {m.explanation}
                              </p>
                            </div>
                          </div>

                          <div className="self-end sm:self-center">
                            <button 
                              onClick={() => {
                                const hl = [];
                                for (let i = m.startLine; i <= m.endLine; i++) hl.push(i);
                                openReader(m.pageNumber, hl, m.noteLine);
                              }}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition">
                              <BookOpenCheck className="w-3.5 h-3.5" />
                              <span>Go to Page {m.pageNumber}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reader Modal */}
      {readerModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Book className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 leading-tight">
                    Page {readerModal.pageNumber} — {readerModal.pageData?.title || activeBook?.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                    {readerModal.highlightLines.length > 0 && (
                      <span className="font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Highlighted Lines {readerModal.highlightLines[0]}–{readerModal.highlightLines[readerModal.highlightLines.length - 1]}
                      </span>
                    )}
                    <span>•</span>
                    <span>{readerModal.pageData?.lines?.length || 0} lines on this page</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => navigateReader(-1)} 
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-semibold px-2">Page {readerModal.pageNumber}</span>
                <button 
                  onClick={() => navigateReader(1)} 
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setReaderModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex justify-center items-start">
              <div className="bg-white shadow-md rounded-xl border border-slate-300 max-w-3xl w-full p-6 font-mono text-xs space-y-1">
                {readerModal.pageData?.lines?.map(l => {
                  const isHl = readerModal.highlightLines.includes(l.lineNumber);
                  return (
                    <div key={l.lineNumber} className={`flex items-start py-0.5 px-2 rounded ${isHl ? 'line-highlighted' : 'hover:bg-slate-50'}`}>
                      <span className="line-gutter">{l.lineNumber}</span>
                      <span className="flex-1 pl-4 text-slate-800 leading-relaxed">{l.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
              <div className="truncate text-slate-600 pr-4">
                <span className="font-semibold text-indigo-600 mr-1">Note:</span>
                <span>{readerModal.noteContext || 'Page inspection'}</span>
              </div>
              <button 
                onClick={() => setReaderModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition">
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Gemini AI Configuration</h3>
              </div>
              <button onClick={() => setApiKeyModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              The app operates 100% offline using in-memory BM25. Optionally supply a Google Gemini API Key for deep LLM reasoning.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Gemini API Key (Optional)</label>
              <input 
                type="password" 
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..." 
                className="w-full text-xs font-mono rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
              <button 
                onClick={() => {
                  localStorage.setItem('gemini_api_key', geminiApiKey.trim());
                  setApiKeyModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
