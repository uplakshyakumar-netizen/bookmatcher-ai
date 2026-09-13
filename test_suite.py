import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.storage import init_db, get_all_books, get_page_info
from app.sample_data import ensure_sample_book_loaded, SAMPLE_NOTES
from app.ai_matcher import match_notes_to_book
from app.pdf_processor import render_page_image

def run_tests():
    print("1. Initializing database...")
    init_db()
    print("   Database initialized successfully.")

    print("\n2. Loading sample textbook & notes...")
    data = ensure_sample_book_loaded()
    book = data["book"]
    book_id = book["id"]
    assert book["total_pages"] > 0
    print(f"   Success: Loaded '{book['title']}' ({book['total_pages']} pages, {len(book['toc'])} TOC chapters).")

    print("\n3. Testing Page line extraction on Page 4...")
    page_info = get_page_info(book_id, 4)
    assert page_info is not None
    assert len(page_info["lines"]) > 0
    print(f"   Success: Extracted {len(page_info['lines'])} lines from Page 4.")

    print("\n4. Testing PDF Page Highlighting and Image Rendering...")
    img_bytes = render_page_image(book["file_path"], 4, highlight_lines=[3, 4], book_id=book_id)
    assert len(img_bytes) > 2000
    print(f"   Success: Rendered {len(img_bytes)} bytes of JPEG page with line highlights.")

    print("\n5. Testing Line-by-Line AI Matching...")
    results = match_notes_to_book(book_id, SAMPLE_NOTES)
    assert results["notes_line_count"] > 0
    assert len(results["matches"]) > 0
    print(f"   Success: Matched {results['notes_line_count']} note lines to {results['pages_to_read_count']} unique pages.")
    print(f"   Study time saved: {results['time_saved_percent']}%")
    print(f"   Reading ranges: {results['reading_ranges']}")

    for idx, m in enumerate(results["matches"][:3], 1):
        print(f"\n   [Match {idx}]")
        print(f"   Note: '{m['note_line']}'")
        print(f"   -> Page {m['page_number']}, Lines {m['start_line']}-{m['end_line']} (Confidence: {m['confidence']}%)")
        print(f"   -> Book quote: '{m['exact_quote']}'")
        print(f"   -> Reason: {m['explanation']}")

    print("\n6. Verifying Frontend Static Assets...")
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
    for f in ["index.html", "app.js", "styles.css"]:
        assert os.path.exists(os.path.join(frontend_dir, f))
    print("   Success: index.html, app.js, and styles.css verified.")

    print("\n=======================================================")
    print(" ALL SYSTEM & LOGIC TESTS PASSED! 🎉")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
