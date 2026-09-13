// BookMatcher Frontend Application Logic v1.1

let state = {
  books: [],
  activeBook: null,
  matchResults: null,
  instantSearchResult: null,
  currentInstantViewerPage: 1,
  geminiApiKey: localStorage.getItem("gemini_api_key") || "",
  studiedPages: new Set(JSON.parse(localStorage.getItem("studied_pages") || "[]")),
  reader: {
    pageNumber: 1,
    highlightLines: [],
    noteContext: "",
    mode: "image"
  }
};

// DOM Elements: Header & Books
const bookSelector = document.getElementById("bookSelector");
const activeBookTitle = document.getElementById("activeBookTitle");
const activeBookPages = document.getElementById("activeBookPages");
const activeBookTOC = document.getElementById("activeBookTOC");
const btnTriggerBookUpload = document.getElementById("btnTriggerBookUpload");
const pdfFileInput = document.getElementById("pdfFileInput");
const uploadProgressContainer = document.getElementById("uploadProgressContainer");
const uploadProgressBar = document.getElementById("uploadProgressBar");
const uploadProgressText = document.getElementById("uploadProgressText");
const uploadProgressPercent = document.getElementById("uploadProgressPercent");
const btnQuickDemo = document.getElementById("btnQuickDemo");

// Tabs
const tabBtnInstantSearch = document.getElementById("tabBtnInstantSearch");
const tabBtnBatchNotes = document.getElementById("tabBtnBatchNotes");
const viewInstantSearch = document.getElementById("viewInstantSearch");
const viewBatchNotes = document.getElementById("viewBatchNotes");

// Instant Page Finder Elements
const instantSearchForm = document.getElementById("instantSearchForm");
const instantSearchInput = document.getElementById("instantSearchInput");
const btnInstantSearchSubmit = document.getElementById("btnInstantSearchSubmit");
const instantResultCard = document.getElementById("instantResultCard");
const resExactPageNumber = document.getElementById("resExactPageNumber");
const resExactLineBadge = document.getElementById("resExactLineBadge");
const resSectionTitle = document.getElementById("resSectionTitle");
const resConfidenceScore = document.getElementById("resConfidenceScore");
const resExactQuote = document.getElementById("resExactQuote");
const resExplanation = document.getElementById("resExplanation");
const resAlternativePagesBox = document.getElementById("resAlternativePagesBox");
const resAlternativePagesList = document.getElementById("resAlternativePagesList");
const instantPageImage = document.getElementById("instantPageImage");
const instantViewerPageNum = document.getElementById("instantViewerPageNum");
const btnPrevInstantPage = document.getElementById("btnPrevInstantPage");
const btnNextInstantPage = document.getElementById("btnNextInstantPage");
const btnOpenInFullModal = document.getElementById("btnOpenInFullModal");

// Batch Notes Elements
const notesInput = document.getElementById("notesInput");
const noteLinesCount = document.getElementById("noteLinesCount");
const notesPdfFileInput = document.getElementById("notesPdfFileInput");
const notesTxtFileInput = document.getElementById("notesTxtFileInput");
const notesPdfUploadBanner = document.getElementById("notesPdfUploadBanner");
const notesPdfUploadText = document.getElementById("notesPdfUploadText");
const btnLoadSampleNotes = document.getElementById("btnLoadSampleNotes");
const btnClearNotes = document.getElementById("btnClearNotes");
const btnDiscoverMatches = document.getElementById("btnDiscoverMatches");
const resultsContainer = document.getElementById("resultsContainer");

// Batch Results Elements
const metricPagesToRead = document.getElementById("metricPagesToRead");
const metricTotalPages = document.getElementById("metricTotalPages");
const metricTimeSaved = document.getElementById("metricTimeSaved");
const metricNotesMatched = document.getElementById("metricNotesMatched");
const heatmapStrip = document.getElementById("heatmapStrip");
const heatmapMidPage = document.getElementById("heatmapMidPage");
const heatmapEndPage = document.getElementById("heatmapEndPage");
const readingRangesList = document.getElementById("readingRangesList");
const checklistProgressText = document.getElementById("checklistProgressText");
const matchesList = document.getElementById("matchesList");
const filterMatchInput = document.getElementById("filterMatchInput");
const btnExportMarkdown = document.getElementById("btnExportMarkdown");

// Modal Reader Elements
const readerModal = document.getElementById("readerModal");
const btnCloseReaderModal = document.getElementById("btnCloseReaderModal");
const btnReaderDone = document.getElementById("btnReaderDone");
const readerModalTitle = document.getElementById("readerModalTitle");
const readerHighlightedLinesBadge = document.getElementById("readerHighlightedLinesBadge");
const readerTotalLinesBadge = document.getElementById("readerTotalLinesBadge");
const readerCurrentPageNumber = document.getElementById("readerCurrentPageNumber");
const btnReaderPrevPage = document.getElementById("btnReaderPrevPage");
const btnReaderNextPage = document.getElementById("btnReaderNextPage");
const btnViewImage = document.getElementById("btnViewImage");
const btnViewText = document.getElementById("btnViewText");
const readerImageView = document.getElementById("readerImageView");
const readerTextView = document.getElementById("readerTextView");
const readerPageImg = document.getElementById("readerPageImg");
const imageLoader = document.getElementById("imageLoader");
const readerTextLines = document.getElementById("readerTextLines");
const readerNoteContext = document.getElementById("readerNoteContext");

// API Key Modal Elements
const apiKeyModal = document.getElementById("apiKeyModal");
const btnOpenApiKeyModal = document.getElementById("btnOpenApiKeyModal");
const btnCloseApiKeyModal = document.getElementById("btnCloseApiKeyModal");
const btnSaveApiKey = document.getElementById("btnSaveApiKey");
const geminiApiKeyInput = document.getElementById("geminiApiKeyInput");
const apiKeyStatusText = document.getElementById("apiKeyStatusText");

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  updateApiKeyBadge();
  await loadBooks();
  setupEventListeners();
});

function updateApiKeyBadge() {
  if (state.geminiApiKey) {
    apiKeyStatusText.textContent = "Gemini AI: Active";
    btnOpenApiKeyModal.classList.add("border-amber-400", "bg-amber-50/50");
  } else {
    apiKeyStatusText.textContent = "Local High-Precision BM25";
    btnOpenApiKeyModal.classList.remove("border-amber-400", "bg-amber-50/50");
  }
}

async function loadBooks() {
  try {
    const res = await fetch("/api/books");
    const data = await res.json();
    state.books = data.books || [];

    if (state.books.length === 0) {
      const demoRes = await fetch("/api/demo/load", { method: "POST" });
      const demoData = await demoRes.json();
      state.books = [demoData.book];
    }

    renderBookSelector();
    setActiveBook(state.books[0].id);
  } catch (err) {
    console.error("Failed to load books:", err);
  }
}

function renderBookSelector() {
  bookSelector.innerHTML = "";
  state.books.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = `${b.title} (${b.total_pages} pages)`;
    bookSelector.appendChild(opt);
  });
}

function setActiveBook(bookId) {
  const found = state.books.find(b => b.id === bookId);
  if (!found) return;
  state.activeBook = found;
  bookSelector.value = found.id;
  activeBookTitle.textContent = found.title;
  activeBookPages.textContent = `${found.total_pages} Pages Indexed`;
  activeBookTOC.textContent = `${found.toc ? found.toc.length : 0} Chapters & Sections`;
  if (heatmapEndPage) heatmapEndPage.textContent = found.total_pages;
  if (heatmapMidPage) heatmapMidPage.textContent = Math.round(found.total_pages / 2);
}

function setupEventListeners() {
  // Tab Switching
  tabBtnInstantSearch.addEventListener("click", () => switchTab("instant"));
  tabBtnBatchNotes.addEventListener("click", () => switchTab("batch"));

  // Book Selection & Upload
  bookSelector.addEventListener("change", (e) => setActiveBook(e.target.value));
  btnTriggerBookUpload.addEventListener("click", () => pdfFileInput.click());
  pdfFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handlePdfUpload(e.target.files[0]);
  });

  // Instant Search Form
  instantSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = instantSearchInput.value.trim();
    if (q) runInstantSearch(q);
  });

  // Quick suggestion pills
  document.querySelectorAll(".quickQueryBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      instantSearchInput.value = e.target.textContent;
      runInstantSearch(e.target.textContent);
    });
  });

  // Instant viewer page navigation
  btnPrevInstantPage.addEventListener("click", () => navigateInstantViewer(-1));
  btnNextInstantPage.addEventListener("click", () => navigateInstantViewer(1));
  btnOpenInFullModal.addEventListener("click", () => {
    if (state.instantSearchResult) {
      const r = state.instantSearchResult;
      const hl = [];
      for (let i = r.start_line; i <= r.end_line; i++) hl.push(i);
      openReader(r.exact_page, hl, r.query);
    }
  });

  // Notes PDF Upload
  notesPdfFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleNotesPdfUpload(e.target.files[0]);
  });

  // Notes TXT/MD Upload
  notesTxtFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        notesInput.value = evt.target.result;
        updateNotesLineCount();
      };
      reader.readAsText(e.target.files[0]);
    }
  });

  notesInput.addEventListener("input", updateNotesLineCount);

  btnLoadSampleNotes.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/demo/load", { method: "POST" });
      const data = await res.json();
      notesInput.value = data.sample_notes;
      updateNotesLineCount();
      notesPdfUploadBanner.classList.add("hidden");
    } catch (err) {
      console.error(err);
    }
  });

  btnClearNotes.addEventListener("click", () => {
    notesInput.value = "";
    updateNotesLineCount();
    notesPdfUploadBanner.classList.add("hidden");
  });

  btnDiscoverMatches.addEventListener("click", runBatchMatching);

  // 1-Click Quick Demo
  btnQuickDemo.addEventListener("click", async () => {
    btnQuickDemo.disabled = true;
    btnQuickDemo.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Running Demo...</span>`;
    lucide.createIcons();

    try {
      const res = await fetch("/api/demo/load", { method: "POST" });
      const data = await res.json();
      await loadBooks();
      setActiveBook(data.book.id);

      // Run an instant search for demo
      instantSearchInput.value = "How does page fault trapping work?";
      await runInstantSearch("How does page fault trapping work?");
    } catch (err) {
      alert("Demo error: " + err.message);
    } finally {
      btnQuickDemo.disabled = false;
      btnQuickDemo.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5 fill-indigo-700"></i><span>1-Click Demo</span>`;
      lucide.createIcons();
    }
  });

  // Search in matches list
  filterMatchInput.addEventListener("input", filterMatches);

  // Reader Modal Controls
  btnCloseReaderModal.addEventListener("click", closeReader);
  btnReaderDone.addEventListener("click", closeReader);
  btnReaderPrevPage.addEventListener("click", () => navigateReader(-1));
  btnReaderNextPage.addEventListener("click", () => navigateReader(1));
  btnViewImage.addEventListener("click", () => setReaderViewMode("image"));
  btnViewText.addEventListener("click", () => setReaderViewMode("text"));

  // API Key Modal
  btnOpenApiKeyModal.addEventListener("click", () => {
    geminiApiKeyInput.value = state.geminiApiKey;
    apiKeyModal.classList.remove("hidden");
  });
  btnCloseApiKeyModal.addEventListener("click", () => apiKeyModal.classList.add("hidden"));
  btnSaveApiKey.addEventListener("click", () => {
    state.geminiApiKey = geminiApiKeyInput.value.trim();
    localStorage.setItem("gemini_api_key", state.geminiApiKey);
    updateApiKeyBadge();
    apiKeyModal.classList.add("hidden");
  });

  btnExportMarkdown.addEventListener("click", exportMarkdownGuide);
}

function switchTab(tab) {
  if (tab === "instant") {
    tabBtnInstantSearch.classList.add("border-indigo-600", "text-indigo-600");
    tabBtnInstantSearch.classList.remove("border-transparent", "text-slate-500");
    tabBtnBatchNotes.classList.remove("border-indigo-600", "text-indigo-600");
    tabBtnBatchNotes.classList.add("border-transparent", "text-slate-500");
    viewInstantSearch.classList.remove("hidden");
    viewBatchNotes.classList.add("hidden");
  } else {
    tabBtnBatchNotes.classList.add("border-indigo-600", "text-indigo-600");
    tabBtnBatchNotes.classList.remove("border-transparent", "text-slate-500");
    tabBtnInstantSearch.classList.remove("border-indigo-600", "text-indigo-600");
    tabBtnInstantSearch.classList.add("border-transparent", "text-slate-500");
    viewBatchNotes.classList.remove("hidden");
    viewInstantSearch.classList.add("hidden");
  }
}

// -------------------------------------------------------------
// INSTANT PAGE FINDER LOGIC (Direct Exact Page Destination)
// -------------------------------------------------------------
async function runInstantSearch(query) {
  if (!state.activeBook) {
    alert("Please select a textbook first.");
    return;
  }

  btnInstantSearchSubmit.disabled = true;
  btnInstantSearchSubmit.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Finding Page...</span>`;
  lucide.createIcons();

  try {
    const res = await fetch("/api/search/exact-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: state.activeBook.id,
        query: query,
        gemini_api_key: state.geminiApiKey || null
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Search failed");
    }

    const data = await res.json();
    state.instantSearchResult = data;
    renderInstantResult(data);

  } catch (err) {
    alert("Search error: " + err.message);
  } finally {
    btnInstantSearchSubmit.disabled = false;
    btnInstantSearchSubmit.innerHTML = `<i data-lucide="arrow-right-circle" class="w-4 h-4"></i><span>Go to Exact Page</span>`;
    lucide.createIcons();
  }
}

function renderInstantResult(data) {
  instantResultCard.classList.remove("hidden");

  resExactPageNumber.textContent = data.exact_page;
  const lineSpan = data.start_line === data.end_line ? `Line ${data.start_line}` : `Lines ${data.start_line}–${data.end_line}`;
  resExactLineBadge.textContent = lineSpan;
  resSectionTitle.textContent = data.section_title;
  resConfidenceScore.textContent = `${data.confidence}% Match`;
  resExactQuote.textContent = data.exact_quote || "Direct chapter reference.";
  resExplanation.textContent = data.explanation;

  // Alternative pages
  resAlternativePagesList.innerHTML = "";
  if (data.alternative_pages && data.alternative_pages.length > 0) {
    resAlternativePagesBox.classList.remove("hidden");
    data.alternative_pages.forEach(alt => {
      const btn = document.createElement("button");
      btn.className = "px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 font-medium transition text-[11px]";
      btn.textContent = `Page ${alt.page_number} (${alt.section_title.substring(0, 25)}...)`;
      btn.addEventListener("click", () => {
        loadInstantViewerPage(alt.page_number, []);
      });
      resAlternativePagesList.appendChild(btn);
    });
  } else {
    resAlternativePagesBox.classList.add("hidden");
  }

  // Load the live page image directly with highlights!
  const hl = [];
  for (let i = data.start_line; i <= data.end_line; i++) hl.push(i);
  loadInstantViewerPage(data.exact_page, hl);

  // Scroll to result smoothly
  instantResultCard.scrollIntoView({ behavior: "smooth" });
}

function loadInstantViewerPage(pageNum, highlightLines = []) {
  state.currentInstantViewerPage = pageNum;
  instantViewerPageNum.textContent = `Page ${pageNum}`;

  const bookId = state.activeBook.id;
  const hlStr = highlightLines.join(",");
  const imgUrl = `/api/books/${bookId}/page-image/${pageNum}${hlStr ? `?highlight_lines=${hlStr}` : ''}`;

  instantPageImage.src = imgUrl;
}

function navigateInstantViewer(delta) {
  if (!state.activeBook) return;
  const newPage = state.currentInstantViewerPage + delta;
  if (newPage >= 1 && newPage <= state.activeBook.total_pages) {
    loadInstantViewerPage(newPage, []);
  }
}

// -------------------------------------------------------------
// NOTES PDF UPLOAD HANDLER (Class Notes in PDF format)
// -------------------------------------------------------------
async function handleNotesPdfUpload(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    alert("Please select a PDF notes or slides file.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  notesPdfUploadBanner.classList.remove("hidden");
  notesPdfUploadText.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-1 text-emerald-600"></i> Parsing lecture slides & text from "${escapeHtml(file.name)}"...`;
  lucide.createIcons();

  try {
    const res = await fetch("/api/notes/extract-pdf", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to extract text from notes PDF");
    }

    const data = await res.json();
    notesInput.value = data.extracted_notes;
    updateNotesLineCount();

    notesPdfUploadText.innerHTML = `<strong>${escapeHtml(file.name)}</strong>: Successfully extracted <strong>${data.total_slides} slides</strong> with structured headings!`;
    
    // Automatically switch to batch tab if not already on it
    switchTab("batch");
    
    // Pulse the discover button
    btnDiscoverMatches.classList.add("ring-4", "ring-indigo-300");
    setTimeout(() => btnDiscoverMatches.classList.remove("ring-4", "ring-indigo-300"), 2000);

  } catch (err) {
    notesPdfUploadBanner.classList.add("hidden");
    alert("Error uploading notes PDF: " + err.message);
  }
}

function updateNotesLineCount() {
  const text = notesInput.value;
  const lines = text.split("\n").filter(l => l.trim().length > 3 && !l.trim().startsWith("#"));
  noteLinesCount.innerHTML = `<strong class="text-slate-700">${lines.length}</strong> instruction lines identified`;
}

// -------------------------------------------------------------
// TEXTBOOK PDF UPLOAD HANDLER
// -------------------------------------------------------------
async function handlePdfUpload(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    alert("Please upload a valid PDF document.");
    return;
  }

  uploadProgressContainer.classList.remove("hidden");
  uploadProgressText.textContent = `Indexing "${file.name}" (~1,000 pages)...`;
  uploadProgressPercent.textContent = "25%";
  uploadProgressBar.style.width = "25%";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", file.name.replace(/\.pdf$/i, ""));

  try {
    uploadProgressPercent.textContent = "70%";
    uploadProgressBar.style.width = "70%";

    const res = await fetch("/api/books/upload", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Upload failed");
    }

    const data = await res.json();
    uploadProgressPercent.textContent = "100%";
    uploadProgressBar.style.width = "100%";

    setTimeout(async () => {
      uploadProgressContainer.classList.add("hidden");
      await loadBooks();
      setActiveBook(data.book.id);
      alert(`🎉 Successfully indexed "${data.book.title}" (${data.book.total_pages} pages)!`);
    }, 400);

  } catch (err) {
    uploadProgressContainer.classList.add("hidden");
    alert("Error indexing textbook: " + err.message);
  }
}

// -------------------------------------------------------------
// BATCH MATCHING LOGIC
// -------------------------------------------------------------
async function runBatchMatching() {
  if (!state.activeBook) {
    alert("Please select or upload a textbook first.");
    return;
  }

  const notesText = notesInput.value.trim();
  if (!notesText) {
    alert("Please paste classroom notes or upload a notes PDF.");
    return;
  }

  btnDiscoverMatches.disabled = true;
  btnDiscoverMatches.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Pinpointing Pages & Lines...</span>`;
  lucide.createIcons();

  try {
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: state.activeBook.id,
        notes_text: notesText,
        gemini_api_key: state.geminiApiKey || null
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Matching failed");
    }

    const results = await res.json();
    state.matchResults = results;
    renderBatchResults(results);

    resultsContainer.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    alert("Matching error: " + err.message);
  } finally {
    btnDiscoverMatches.disabled = false;
    btnDiscoverMatches.innerHTML = `<i data-lucide="search" class="w-4 h-4"></i><span>Match All Class Notes</span>`;
    lucide.createIcons();
  }
}

function renderBatchResults(results) {
  resultsContainer.classList.remove("hidden");

  metricPagesToRead.textContent = results.pages_to_read_count;
  metricTotalPages.textContent = results.total_book_pages;
  metricTimeSaved.textContent = `${results.time_saved_percent}%`;
  metricNotesMatched.textContent = results.matches.length;

  renderHeatmap(results);
  renderReadingRanges(results);
  renderMatchesList(results.matches);

  updateChecklistProgress();
  lucide.createIcons();
}

function renderHeatmap(results) {
  heatmapStrip.innerHTML = "";
  const total = results.total_book_pages;

  results.unique_pages.forEach(pageNum => {
    const leftPercent = ((pageNum - 1) / Math.max(1, total - 1)) * 100;
    const marker = document.createElement("div");
    marker.className = "heatmap-marker group";
    marker.style.left = `${Math.min(99.5, Math.max(0.5, leftPercent))}%`;
    marker.title = `Page ${pageNum}`;

    marker.innerHTML = `
      <div class="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded whitespace-nowrap z-20 shadow-lg pointer-events-none">
        Page ${pageNum}
      </div>
    `;

    marker.addEventListener("click", () => {
      openReader(pageNum, [], `Page ${pageNum}`);
    });

    heatmapStrip.appendChild(marker);
  });
}

function renderReadingRanges(results) {
  readingRangesList.innerHTML = "";

  results.reading_ranges.forEach(r => {
    const isStudied = Array.from({ length: r.count }, (_, i) => r.start + i).every(p => state.studiedPages.has(p));
    const chip = document.createElement("button");
    chip.className = `inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
      isStudied 
        ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
    }`;

    const rangeLabel = r.start === r.end ? `Page ${r.start}` : `Pages ${r.start}–${r.end}`;
    chip.innerHTML = `
      <span class="w-2 h-2 rounded-full ${isStudied ? 'bg-emerald-500' : 'bg-indigo-500'}"></span>
      <span class="font-semibold">${rangeLabel}</span>
      <span class="text-[11px] text-slate-400">(${r.count} pg${r.count > 1 ? 's' : ''})</span>
    `;

    chip.addEventListener("click", () => {
      openReader(r.start, [], `Range: ${rangeLabel}`);
    });

    readingRangesList.appendChild(chip);
  });
}

function renderMatchesList(matches) {
  matchesList.innerHTML = "";

  if (matches.length === 0) {
    matchesList.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">No matching lines found.</div>`;
    return;
  }

  matches.forEach(m => {
    const isStudied = state.studiedPages.has(m.page_number);
    const item = document.createElement("div");
    item.className = `p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-start gap-4 ${isStudied ? 'bg-emerald-50/20' : ''}`;
    
    const lineSpan = m.start_line === m.end_line ? `Line ${m.start_line}` : `Lines ${m.start_line}–${m.end_line}`;

    item.innerHTML = `
      <div class="pt-0.5">
        <input type="checkbox" ${isStudied ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer" data-page="${m.page_number}">
      </div>

      <div class="flex-1 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            ${escapeHtml(m.topic)}
          </span>
          <span class="text-xs text-slate-400">• Note Line ${m.line_id}</span>
        </div>

        <div class="font-medium text-slate-900 text-xs sm:text-sm leading-relaxed">
          "${escapeHtml(m.note_line)}"
        </div>

        <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
            <div class="flex items-center space-x-2">
              <span class="font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200 flex items-center space-x-1">
                <i data-lucide="book" class="w-3.5 h-3.5 text-indigo-600"></i>
                <span>Exact Page: ${m.page_number}</span>
              </span>
              <span class="font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold text-[11px]">
                ${lineSpan}
              </span>
              <span class="text-slate-500 text-[11px] font-medium hidden md:inline">
                (${escapeHtml(m.section_title || '')})
              </span>
            </div>

            <div class="flex items-center space-x-1 text-[11px] text-emerald-700 font-semibold">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
              <span>${m.confidence}% Confidence</span>
            </div>
          </div>

          <div class="font-mono text-[11px] text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-normal">
            <span class="text-slate-400 select-none mr-1">“</span>${escapeHtml(m.exact_quote)}<span class="text-slate-400 select-none ml-1">”</span>
          </div>

          <p class="text-slate-600 text-[11px] leading-relaxed">
            <strong class="text-slate-700">Why study this:</strong> ${escapeHtml(m.explanation)}
          </p>
        </div>
      </div>

      <div class="self-end sm:self-center">
        <button class="btnOpenReader inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition">
          <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
          <span>Go to Page ${m.page_number}</span>
        </button>
      </div>
    `;

    const checkbox = item.querySelector("input[type='checkbox']");
    checkbox.addEventListener("change", (e) => {
      togglePageStudied(m.page_number, e.target.checked);
    });

    const btnReader = item.querySelector(".btnOpenReader");
    btnReader.addEventListener("click", () => {
      const hl = [];
      for (let i = m.start_line; i <= m.end_line; i++) hl.push(i);
      openReader(m.page_number, hl, m.note_line);
    });

    matchesList.appendChild(item);
  });
}

function filterMatches(e) {
  const q = e.target.value.toLowerCase().trim();
  if (!state.matchResults) return;

  if (!q) {
    renderMatchesList(state.matchResults.matches);
    lucide.createIcons();
    return;
  }

  const filtered = state.matchResults.matches.filter(m => 
    m.note_line.toLowerCase().includes(q) ||
    m.topic.toLowerCase().includes(q) ||
    m.exact_quote.toLowerCase().includes(q) ||
    `page ${m.page_number}`.includes(q)
  );

  renderMatchesList(filtered);
  lucide.createIcons();
}

function togglePageStudied(pageNum, isChecked) {
  if (isChecked) {
    state.studiedPages.add(pageNum);
  } else {
    state.studiedPages.delete(pageNum);
  }
  localStorage.setItem("studied_pages", JSON.stringify(Array.from(state.studiedPages)));
  updateChecklistProgress();
  if (state.matchResults) {
    renderReadingRanges(state.matchResults);
  }
}

function updateChecklistProgress() {
  if (!state.matchResults) return;
  const total = state.matchResults.pages_to_read_count;
  const studiedCount = state.matchResults.unique_pages.filter(p => state.studiedPages.has(p)).length;
  checklistProgressText.textContent = `${studiedCount} of ${total} pages studied (${Math.round((studiedCount / Math.max(1, total)) * 100)}%)`;
}

// -------------------------------------------------------------
// FULLSCREEN READER MODAL LOGIC
// -------------------------------------------------------------
async function openReader(pageNumber, highlightLines = [], noteContext = "") {
  state.reader.pageNumber = pageNumber;
  state.reader.highlightLines = highlightLines;
  state.reader.noteContext = noteContext;

  readerModalTitle.textContent = `Page ${pageNumber} — ${state.activeBook ? state.activeBook.title : 'Textbook'}`;
  readerCurrentPageNumber.textContent = `Page ${pageNumber}`;
  readerNoteContext.textContent = noteContext ? `"${noteContext}"` : "Textbook Inspection";

  if (highlightLines.length > 0) {
    const span = highlightLines.length === 1 ? `Line ${highlightLines[0]}` : `Lines ${highlightLines[0]}–${highlightLines[highlightLines.length - 1]}`;
    readerHighlightedLinesBadge.textContent = `Highlighted ${span}`;
    readerHighlightedLinesBadge.classList.remove("hidden");
  } else {
    readerHighlightedLinesBadge.classList.add("hidden");
  }

  readerModal.classList.remove("hidden");
  await renderReaderCurrentPage();
  lucide.createIcons();
}

function closeReader() {
  readerModal.classList.add("hidden");
}

function navigateReader(delta) {
  if (!state.activeBook) return;
  const newPage = state.reader.pageNumber + delta;
  if (newPage >= 1 && newPage <= state.activeBook.total_pages) {
    state.reader.pageNumber = newPage;
    state.reader.highlightLines = [];
    readerCurrentPageNumber.textContent = `Page ${newPage}`;
    readerModalTitle.textContent = `Page ${newPage} — ${state.activeBook.title}`;
    readerHighlightedLinesBadge.classList.add("hidden");
    renderReaderCurrentPage();
  }
}

function setReaderViewMode(mode) {
  state.reader.mode = mode;
  if (mode === "image") {
    btnViewImage.classList.add("text-indigo-700", "bg-indigo-50");
    btnViewImage.classList.remove("text-slate-600");
    btnViewText.classList.remove("text-indigo-700", "bg-indigo-50");
    btnViewText.classList.add("text-slate-600");
    readerImageView.classList.remove("hidden");
    readerTextView.classList.add("hidden");
  } else {
    btnViewText.classList.add("text-indigo-700", "bg-indigo-50");
    btnViewText.classList.remove("text-slate-600");
    btnViewImage.classList.remove("text-indigo-700", "bg-indigo-50");
    btnViewImage.classList.add("text-slate-600");
    readerImageView.classList.add("hidden");
    readerTextView.classList.remove("hidden");
  }
  renderReaderCurrentPage();
}

async function renderReaderCurrentPage() {
  const pageNum = state.reader.pageNumber;
  const bookId = state.activeBook.id;
  const hlStr = state.reader.highlightLines.join(",");

  if (state.reader.mode === "image") {
    imageLoader.classList.remove("hidden");
    readerPageImg.classList.add("hidden");

    const imgUrl = `/api/books/${bookId}/page-image/${pageNum}${hlStr ? `?highlight_lines=${hlStr}` : ''}`;
    
    const tempImg = new Image();
    tempImg.onload = () => {
      readerPageImg.src = imgUrl;
      imageLoader.classList.add("hidden");
      readerPageImg.classList.remove("hidden");
    };
    tempImg.src = imgUrl;

  } else {
    try {
      const res = await fetch(`/api/books/${bookId}/page/${pageNum}`);
      const data = await res.json();
      readerTotalLinesBadge.textContent = `${data.line_count} lines on this page`;

      readerTextLines.innerHTML = "";
      data.lines.forEach(l => {
        const isHl = state.reader.highlightLines.includes(l.line_number);
        const lineDiv = document.createElement("div");
        lineDiv.className = `flex items-start py-0.5 px-2 rounded ${isHl ? 'line-highlighted' : 'hover:bg-slate-50'}`;
        lineDiv.innerHTML = `
          <span class="line-gutter">${l.line_number}</span>
          <span class="flex-1 pl-4 text-slate-800 leading-relaxed">${escapeHtml(l.text)}</span>
        `;
        readerTextLines.appendChild(lineDiv);
      });
    } catch (err) {
      console.error("Failed to load text lines:", err);
    }
  }
}

function exportMarkdownGuide() {
  if (!state.matchResults) return;

  const res = state.matchResults;
  let md = `# Study Guide: ${res.book_title}\n\n`;
  md += `**Target Pages to Read:** ${res.pages_to_read_count} of ${res.total_book_pages} pages (${res.time_saved_percent}% study time saved)\n\n`;
  md += `## Recommended Reading Plan\n\n`;

  res.reading_ranges.forEach(r => {
    const label = r.start === r.end ? `Page ${r.start}` : `Pages ${r.start}–${r.end}`;
    md += `- [ ] **${label}** (${r.count} page${r.count > 1 ? 's' : ''})\n`;
  });

  md += `\n## Line-by-Line Classroom Notes Mapping\n\n`;

  res.matches.forEach(m => {
    const lineSpan = m.start_line === m.end_line ? `Line ${m.start_line}` : `Lines ${m.start_line}–${m.end_line}`;
    md += `### ${m.topic}: "${m.note_line}"\n`;
    md += `- **Textbook Location:** Page ${m.page_number}, ${lineSpan} (${m.confidence}% confidence)\n`;
    md += `- **Section:** ${m.section_title || 'Core Chapter'}\n`;
    md += `- **Book Excerpt:** > "${m.exact_quote}"\n`;
    md += `- **Why Study This:** ${m.explanation}\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Study_Guide_${res.book_title.replace(/\s+/g, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
