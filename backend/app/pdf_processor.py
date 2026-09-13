import pymupdf
import os
import io
from typing import List, Dict, Any, Optional
from app.storage import save_book, save_page_batch, get_page_lines

def extract_page_lines_and_text(page: pymupdf.Page) -> Dict[str, Any]:
    """
    Extracts structured lines with line numbers and bboxes from a single PDF page.
    """
    page_dict = page.get_text("dict")
    lines = []
    line_number = 1
    full_text_parts = []
    
    for block in page_dict.get("blocks", []):
        if "lines" in block:
            for l in block["lines"]:
                spans_text = " ".join(s["text"].strip() for s in l.get("spans", []) if s.get("text", "").strip())
                spans_text = spans_text.strip()
                if spans_text:
                    lines.append({
                        "line_number": line_number,
                        "text": spans_text,
                        "bbox": l["bbox"]
                    })
                    full_text_parts.append(spans_text)
                    line_number += 1
                    
    # Fallback to plain text if dictionary extraction yielded empty lines
    if not lines:
        plain_lines = page.get_text("text").splitlines()
        for pl in plain_lines:
            stripped = pl.strip()
            if stripped:
                lines.append({
                    "line_number": line_number,
                    "text": stripped,
                    "bbox": None
                })
                full_text_parts.append(stripped)
                line_number += 1
                
    return {
        "text": "\n".join(full_text_parts),
        "lines": lines
    }

def process_and_index_pdf(pdf_path: str, book_id: str, title: str, batch_size: int = 50) -> Dict[str, Any]:
    """
    Processes an entire PDF book (scalable to 1000+ pages) and saves it to the SQLite database.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at: {pdf_path}")
        
    doc = pymupdf.open(pdf_path)
    total_pages = len(doc)
    
    # Extract Table of Contents
    raw_toc = doc.get_toc() # [[lvl, title, page], ...]
    toc = []
    for item in raw_toc:
        if len(item) >= 3:
            toc.append({
                "level": item[0],
                "title": item[1],
                "page": item[2]
            })
            
    # Save book metadata
    filename = os.path.basename(pdf_path)
    save_book(book_id, title, filename, pdf_path, total_pages, toc)
    
    # Process pages in batches for high speed and minimal memory
    batch = []
    for i, page in enumerate(doc):
        page_num = i + 1
        page_data = extract_page_lines_and_text(page)
        batch.append({
            "page_number": page_num,
            "text": page_data["text"],
            "lines": page_data["lines"]
        })
        
        if len(batch) >= batch_size:
            save_page_batch(book_id, batch)
            batch = []
            
    if batch:
        save_page_batch(book_id, batch)
        
    doc.close()
    
    return {
        "book_id": book_id,
        "title": title,
        "total_pages": total_pages,
        "toc_items": len(toc)
    }

def render_page_image(
    pdf_path: str, 
    page_number: int, 
    highlight_lines: Optional[List[int]] = None,
    book_id: Optional[str] = None,
    dpi: int = 150
) -> bytes:
    """
    Renders a specific page of the PDF to JPEG bytes.
    If highlight_lines are provided, applies highlighted rectangles on those lines.
    """
    doc = pymupdf.open(pdf_path)
    if page_number < 1 or page_number > len(doc):
        doc.close()
        raise ValueError(f"Page number {page_number} out of range (1..{len(doc)})")
        
    page = doc[page_number - 1]
    
    # If highlight lines requested, draw highlight annotations
    if highlight_lines and book_id:
        stored_lines = get_page_lines(book_id, page_number)
        line_map = {l["line_number"]: l["bbox"] for l in stored_lines if l.get("bbox")}
        
        for hl in highlight_lines:
            bbox = line_map.get(hl)
            if bbox:
                # Add a yellow highlight rect
                rect = pymupdf.Rect(bbox[0] - 2, bbox[1] - 1, bbox[2] + 2, bbox[3] + 1)
                annot = page.add_highlight_annot(rect)
                annot.set_colors(stroke=(1.0, 0.85, 0.2)) # bright warm yellow/amber
                annot.update()
                
    pix = page.get_pixmap(dpi=dpi)
    img_bytes = pix.tobytes("jpeg")
    doc.close()
    return img_bytes
