import os
import shutil
import uuid
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import pymupdf

from app.storage import init_db, get_all_books, get_book, get_page_info
from app.pdf_processor import process_and_index_pdf, render_page_image
from app.ai_matcher import match_notes_to_book, find_exact_page_for_query
from app.sample_data import ensure_sample_book_loaded, SAMPLE_NOTES

app = FastAPI(title="Textbook & Class Notes Study Matcher API", version="1.1.0")

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

os.makedirs(UPLOADS_DIR, exist_ok=True)

@app.on_event("startup")
def on_startup():
    init_db()
    try:
        ensure_sample_book_loaded()
    except Exception as e:
        print(f"Sample book setup note: {e}")

@app.get("/api/books")
def list_books():
    books = get_all_books()
    return {"books": books}

@app.get("/api/books/{book_id}")
def get_book_details(book_id: str):
    book = get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@app.post("/api/books/upload")
async def upload_book(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    book_id = f"book_{uuid.uuid4().hex[:8]}"
    save_title = title.strip() if title and title.strip() else os.path.splitext(file.filename)[0]
    safe_filename = f"{book_id}_{file.filename}"
    file_path = os.path.join(UPLOADS_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        result = process_and_index_pdf(file_path, book_id, save_title)
        book = get_book(book_id)
        return {"message": "Textbook processed and indexed successfully", "book": book}
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

@app.post("/api/notes/extract-pdf")
async def extract_notes_pdf(file: UploadFile = File(...)):
    """
    Extracts text from lecture slides or notes PDF and converts into structured markdown notes.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    try:
        contents = await file.read()
        doc = pymupdf.open(stream=contents, filetype="pdf")
        total_slides = len(doc)
        sections = []
        
        for i, page in enumerate(doc):
            text = page.get_text("text").strip()
            if not text:
                continue
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            slide_title = f"Slide {i+1}"
            if lines and len(lines[0]) < 60:
                slide_title = f"Slide {i+1}: {lines[0]}"
                content = lines[1:]
            else:
                content = lines
                
            formatted = []
            for c in content:
                if c.startswith(("-", "*", "•", ">")):
                    formatted.append(c)
                else:
                    formatted.append(f"* {c}")
            sections.append(f"# {slide_title}\n" + "\n".join(formatted))
            
        doc.close()
        markdown_notes = "\n\n".join(sections)
        
        return {
            "filename": file.filename,
            "total_slides": total_slides,
            "extracted_notes": markdown_notes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text from notes PDF: {str(e)}")

@app.get("/api/books/{book_id}/page/{page_number}")
def get_page(book_id: str, page_number: int):
    page_data = get_page_info(book_id, page_number)
    if not page_data:
        raise HTTPException(status_code=404, detail="Page not found")
    return page_data

@app.get("/api/books/{book_id}/page-image/{page_number}")
def get_page_image(book_id: str, page_number: int, highlight_lines: Optional[str] = None):
    book = get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    hl_list = []
    if highlight_lines:
        try:
            hl_list = [int(x.strip()) for x in highlight_lines.split(",") if x.strip()]
        except ValueError:
            pass
            
    try:
        img_bytes = render_page_image(
            pdf_path=book["file_path"],
            page_number=page_number,
            highlight_lines=hl_list,
            book_id=book_id,
            dpi=150
        )
        return Response(content=img_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render page image: {str(e)}")

class ExactSearchRequest(BaseModel):
    book_id: str
    query: str
    gemini_api_key: Optional[str] = None

@app.post("/api/search/exact-page")
def search_exact(req: ExactSearchRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    try:
        result = find_exact_page_for_query(
            book_id=req.book_id,
            query=req.query.strip(),
            gemini_api_key=req.gemini_api_key
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

class MatchRequest(BaseModel):
    book_id: str
    notes_text: str
    gemini_api_key: Optional[str] = None

@app.post("/api/match")
def match_notes(req: MatchRequest):
    if not req.notes_text or not req.notes_text.strip():
        raise HTTPException(status_code=400, detail="Notes text cannot be empty")
        
    try:
        results = match_notes_to_book(
            book_id=req.book_id,
            notes_text=req.notes_text,
            gemini_api_key=req.gemini_api_key
        )
        return results
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching error: {str(e)}")

@app.post("/api/demo/load")
def load_demo():
    res = ensure_sample_book_loaded()
    return {
        "book": res["book"],
        "sample_notes": res["sample_notes"]
    }

# Mount frontend static files
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
