import re
import os
import json
import sqlite3
import requests
from typing import List, Dict, Any, Optional, Tuple
from app.storage import get_db, get_page_lines, get_book

STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 
    'to', 'for', 'of', 'with', 'by', 'how', 'does', 'what', 'why', 'when', 'which', 
    'who', 'work', 'works', 'can', 'from', 'this', 'that', 'these', 'those', 'about',
    'into', 'through', 'over', 'between', 'under', 'their', 'there', 'them'
}

def stem(w: str) -> str:
    """Lightweight suffix stemmer for common English word variants."""
    w = w.lower()
    for s in ['ing', 'tion', 'tions', 'ed', 'es', 's']:
        if len(w) > len(s) + 3 and w.endswith(s):
            return w[:-len(s)]
    return w

def extract_meaningful_tokens(text: str) -> List[str]:
    words = re.findall(r"\b[A-Za-z0-9_]{3,}\b", text.lower())
    return [stem(w) for w in words if w not in STOP_WORDS]

def segment_classroom_notes(notes_text: str) -> List[Dict[str, Any]]:
    """
    Parses classroom notes into individual instructional lines/concepts.
    Preserves heading context for lines that fall under that heading.
    """
    raw_lines = notes_text.splitlines()
    segmented = []
    current_topic = "General Notes"
    line_id = 1
    
    for r_line in raw_lines:
        line_str = r_line.strip()
        if not line_str:
            continue
            
        # Check if line is a heading
        if line_str.startswith(("#", "==", "--")) or line_str.lower().startswith(("topic:", "lecture:", "chapter:", "unit:", "slide:")):
            current_topic = re.sub(r"^[#\-\=\:\s]+", "", line_str).strip()
            continue
            
        # Clean bullet points, numbering, or symbols
        cleaned = re.sub(r"^[\*\-\•\>\d+\.\)]+\s*", "", line_str).strip()
        if len(cleaned) < 5: # Ignore trivial characters
            continue
            
        segmented.append({
            "id": line_id,
            "raw_line": line_str,
            "cleaned_text": cleaned,
            "topic": current_topic
        })
        line_id += 1
        
    return segmented

def search_candidate_pages_fts(book_id: str, query_text: str, top_k: int = 5) -> List[Tuple[int, float]]:
    """
    Candidate page retrieval using SQLite FTS5 BM25 ranking.
    Returns list of (page_number, score).
    """
    tokens = [w for w in re.findall(r"\b[A-Za-z0-9_]{3,}\b", query_text) if w.lower() not in STOP_WORDS]
    if not tokens:
        tokens = re.findall(r"\b[A-Za-z0-9_]{3,}\b", query_text)
        
    if not tokens:
        return [(1, 0.0)]
        
    fts_query = " OR ".join(f'"{t}"' for t in tokens[:12])
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT page_number, bm25(pages_fts) as score
            FROM pages_fts
            WHERE book_id = ? AND pages_fts MATCH ?
            ORDER BY score ASC
            LIMIT ?
        """, (book_id, fts_query, top_k))
        rows = cursor.fetchall()
    except Exception:
        simple_query = " OR ".join(tokens[:6])
        cursor.execute("""
            SELECT page_number, bm25(pages_fts) as score
            FROM pages_fts
            WHERE book_id = ? AND pages_fts MATCH ?
            ORDER BY score ASC
            LIMIT ?
        """, (book_id, simple_query, top_k))
        rows = cursor.fetchall()
        
    conn.close()
    
    results = []
    for r in rows:
        raw_score = r["score"]
        pos_score = abs(raw_score) if raw_score < 0 else (1.0 / (raw_score + 0.1))
        results.append((r["page_number"], pos_score))
        
    if not results:
        results.append((1, 0.0))
        
    return results

def get_chapter_title_for_page(toc: List[Dict[str, Any]], page_number: int) -> str:
    """Finds the chapter/section title corresponding to a page number from TOC."""
    if not toc:
        return f"Page {page_number}"
        
    best_title = f"Page {page_number}"
    highest_match_page = -1
    
    for item in toc:
        item_page = item.get("page", 1)
        if item_page <= page_number and item_page > highest_match_page:
            highest_match_page = item_page
            best_title = item.get("title", f"Page {page_number}")
            
    return best_title

def local_pinpoint_lines(
    book_id: str, 
    note_line: Dict[str, Any], 
    candidate_pages: List[Tuple[int, float]]
) -> Dict[str, Any]:
    """
    High-precision sliding-window alignment with stop-word filtering,
    stemming, bigram boosting, and footer skipping.
    """
    query_text = note_line["cleaned_text"]
    q_tokens = extract_meaningful_tokens(query_text)
    q_set = set(q_tokens)
    
    # Extract lowercased bigrams from query for phrase matching
    words_raw = [w.lower() for w in re.findall(r"\b[A-Za-z0-9_]{3,}\b", query_text)]
    bigrams = set(" ".join(pair) for pair in zip(words_raw, words_raw[1:]))
    
    best_match = {
        "page_number": candidate_pages[0][0] if candidate_pages else 1,
        "start_line": 1,
        "end_line": 1,
        "exact_quote": "",
        "confidence": 35,
        "explanation": "Related section in textbook chapter."
    }
    
    highest_score = -1.0
    
    for page_num, candidate_weight in candidate_pages:
        lines = get_page_lines(book_id, page_num)
        if not lines:
            continue
            
        n_lines = len(lines)
        
        # Sliding window of 1 to 5 lines
        for window_size in range(1, min(6, n_lines + 1)):
            for i in range(n_lines - window_size + 1):
                window_lines = lines[i : i + window_size]
                combined_text = " ".join(l["text"] for l in window_lines)
                
                # Skip short lines that are just page footers (e.g. "Page 6")
                if len(combined_text.strip()) < 15:
                    continue
                    
                w_tokens = extract_meaningful_tokens(combined_text)
                if not w_tokens:
                    continue
                    
                overlap = q_set.intersection(set(w_tokens))
                if not overlap:
                    continue
                    
                coverage = len(overlap) / float(max(1, len(q_set)))
                density = len(overlap) / float(len(w_tokens))
                
                # Check for bigram match bonus
                comb_lower = combined_text.lower()
                bigram_bonus = sum(0.3 for bg in bigrams if bg in comb_lower)
                
                score = (coverage * 0.55) + (density * 0.2) + (bigram_bonus * 0.15) + (min(candidate_weight, 5.0) * 0.1)
                
                if score > highest_score:
                    highest_score = score
                    start_l = window_lines[0]["line_number"]
                    end_l = window_lines[-1]["line_number"]
                    
                    matched_keys = list(overlap)[:5]
                    explanation = f"Textbook Page {page_num} directly covers key concepts ({', '.join(matched_keys)}) matching your inquiry."
                    
                    confidence = min(98, max(50, int(score * 110)))
                    
                    best_match = {
                        "page_number": page_num,
                        "start_line": start_l,
                        "end_line": end_l,
                        "exact_quote": combined_text,
                        "confidence": confidence,
                        "explanation": explanation
                    }
                    
    if highest_score <= 0.05 and candidate_pages:
        page_num = candidate_pages[0][0]
        lines = get_page_lines(book_id, page_num)
        # pick first non-header line
        sample_lines = [l for l in lines if len(l["text"]) > 20][:2]
        if not sample_lines:
            sample_lines = lines[:2]
            
        best_match = {
            "page_number": page_num,
            "start_line": sample_lines[0]["line_number"] if sample_lines else 1,
            "end_line": sample_lines[-1]["line_number"] if sample_lines else 1,
            "exact_quote": " ".join(l["text"] for l in sample_lines) if sample_lines else "",
            "confidence": 40,
            "explanation": f"Concept aligns with textbook Page {page_num} topics."
        }
        
    return best_match

def gemini_pinpoint_lines(
    book_id: str,
    note_line: Dict[str, Any],
    candidate_pages: List[Tuple[int, float]],
    api_key: str
) -> Optional[Dict[str, Any]]:
    """
    Calls Google Gemini API to read the query and candidate book lines.
    """
    try:
        candidate_snippets = []
        for page_num, _ in candidate_pages[:2]:
            lines = get_page_lines(book_id, page_num)
            formatted_lines = [f"[Page {page_num}, Line {l['line_number']}]: {l['text']}" for l in lines]
            candidate_snippets.append("\n".join(formatted_lines))
            
        context_text = "\n\n--- PAGE SEPARATOR ---\n\n".join(candidate_snippets)
        
        prompt = f"""You are an academic textbook tutor. You are given a single line or question from a student's notes, and textbook candidate pages with line numbers.
Identify the SINGLE EXACT textbook page number and line numbers that cover or answer this inquiry.

STUDENT INQUIRY / NOTE LINE:
"{note_line['cleaned_text']}" (Context: {note_line['topic']})

TEXTBOOK CANDIDATE PAGES WITH LINE NUMBERS:
{context_text[:6000]}

Respond strictly with valid JSON:
{{
  "page_number": <int>,
  "start_line": <int>,
  "end_line": <int>,
  "exact_quote": "<verbatim text from the textbook>",
  "confidence": <integer between 0 and 100>,
  "explanation": "<1-2 sentences explaining how this textbook section addresses the inquiry>"
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }
        
        resp = requests.post(url, json=payload, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            raw_content = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_content)
            return {
                "page_number": int(parsed.get("page_number", candidate_pages[0][0])),
                "start_line": int(parsed.get("start_line", 1)),
                "end_line": int(parsed.get("end_line", 1)),
                "exact_quote": str(parsed.get("exact_quote", "")),
                "confidence": int(parsed.get("confidence", 85)),
                "explanation": str(parsed.get("explanation", ""))
            }
    except Exception as e:
        print(f"Gemini API matching notice: {e}")
        
    return None

def find_exact_page_for_query(
    book_id: str,
    query: str,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Directly returns the single authoritative target page and line range for a search query.
    Solves user feedback: 'it's not giving me the exact page i need to go after one search'.
    """
    book = get_book(book_id)
    if not book:
        raise ValueError(f"Book not found: {book_id}")
        
    toc = book.get("toc", [])
    
    # 1. Retrieve candidates
    candidates = search_candidate_pages_fts(book_id, query, top_k=5)
    
    note_item = {
        "id": 1,
        "raw_line": query,
        "cleaned_text": query,
        "topic": "Direct Search"
    }
    
    api_key_to_use = gemini_api_key or os.environ.get("GEMINI_API_KEY")
    pinpoint = None
    if api_key_to_use:
        pinpoint = gemini_pinpoint_lines(book_id, note_item, candidates, api_key_to_use)
        
    if not pinpoint:
        pinpoint = local_pinpoint_lines(book_id, note_item, candidates)
        
    exact_page = pinpoint["page_number"]
    section_title = get_chapter_title_for_page(toc, exact_page)
    
    # Alternative pages (other candidate pages excluding the primary one)
    alt_pages = []
    seen = {exact_page}
    for p_num, _ in candidates:
        if p_num not in seen and len(alt_pages) < 3:
            seen.add(p_num)
            alt_pages.append({
                "page_number": p_num,
                "section_title": get_chapter_title_for_page(toc, p_num)
            })
            
    return {
        "book_id": book_id,
        "book_title": book["title"],
        "total_book_pages": book["total_pages"],
        "query": query,
        "exact_page": exact_page,
        "start_line": pinpoint["start_line"],
        "end_line": pinpoint["end_line"],
        "exact_quote": pinpoint["exact_quote"],
        "confidence": pinpoint["confidence"],
        "section_title": section_title,
        "explanation": pinpoint["explanation"],
        "alternative_pages": alt_pages
    }

def match_notes_to_book(
    book_id: str,
    notes_text: str,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main entry point:
    Reads classroom notes line-by-line, pinpoints exact textbook pages and lines,
    and consolidates a complete study plan.
    """
    book = get_book(book_id)
    if not book:
        raise ValueError(f"Book not found: {book_id}")
        
    total_book_pages = book["total_pages"]
    note_lines = segment_classroom_notes(notes_text)
    toc = book.get("toc", [])
    
    if not note_lines:
        return {
            "error": "No recognizable note lines found. Please provide notes text."
        }
        
    matched_items = []
    unique_pages = set()
    pages_to_lines_map: Dict[int, List[Dict[str, Any]]] = {}
    
    api_key_to_use = gemini_api_key or os.environ.get("GEMINI_API_KEY")
    
    for item in note_lines:
        query = f"{item['topic']} {item['cleaned_text']}"
        candidates = search_candidate_pages_fts(book_id, query, top_k=4)
        
        pinpoint_result = None
        if api_key_to_use:
            pinpoint_result = gemini_pinpoint_lines(book_id, item, candidates, api_key_to_use)
            
        if not pinpoint_result:
            pinpoint_result = local_pinpoint_lines(book_id, item, candidates)
            
        page_num = pinpoint_result["page_number"]
        unique_pages.add(page_num)
        
        match_entry = {
            "line_id": item["id"],
            "topic": item["topic"],
            "note_line": item["cleaned_text"],
            "raw_note": item["raw_line"],
            "page_number": page_num,
            "section_title": get_chapter_title_for_page(toc, page_num),
            "start_line": pinpoint_result["start_line"],
            "end_line": pinpoint_result["end_line"],
            "exact_quote": pinpoint_result["exact_quote"],
            "confidence": pinpoint_result["confidence"],
            "explanation": pinpoint_result["explanation"]
        }
        matched_items.append(match_entry)
        
        if page_num not in pages_to_lines_map:
            pages_to_lines_map[page_num] = []
        pages_to_lines_map[page_num].append(match_entry)
        
    sorted_unique_pages = sorted(list(unique_pages))
    reading_ranges = []
    if sorted_unique_pages:
        range_start = sorted_unique_pages[0]
        prev = sorted_unique_pages[0]
        
        for p in sorted_unique_pages[1:]:
            if p == prev + 1:
                prev = p
            else:
                reading_ranges.append({"start": range_start, "end": prev, "count": prev - range_start + 1})
                range_start = p
                prev = p
        reading_ranges.append({"start": range_start, "end": prev, "count": prev - range_start + 1})
        
    pages_to_read = len(unique_pages)
    time_saved_percent = round((1.0 - (pages_to_read / max(1, total_book_pages))) * 100.0, 1)
    
    return {
        "book_id": book_id,
        "book_title": book["title"],
        "total_book_pages": total_book_pages,
        "notes_line_count": len(note_lines),
        "pages_to_read_count": pages_to_read,
        "time_saved_percent": max(0.0, time_saved_percent),
        "unique_pages": sorted_unique_pages,
        "reading_ranges": reading_ranges,
        "matches": matched_items,
        "page_breakdown": [
            {
                "page_number": p,
                "section_title": get_chapter_title_for_page(toc, p),
                "note_items": pages_to_lines_map[p]
            }
            for p in sorted_unique_pages
        ]
    }
