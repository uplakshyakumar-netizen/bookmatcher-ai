import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "app.db")

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Books table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            total_pages INTEGER NOT NULL,
            toc_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Pages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            text TEXT NOT NULL,
            line_count INTEGER NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
            UNIQUE(book_id, page_number)
        )
    """)
    
    # Lines table (for line-level pinpointing)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS page_lines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            line_number INTEGER NOT NULL,
            text TEXT NOT NULL,
            bbox_json TEXT,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes for speed
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_page_book ON pages(book_id, page_number)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_lines_book_page ON page_lines(book_id, page_number, line_number)")
    
    # Full-text search virtual table for pages
    cursor.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
            book_id UNINDEXED,
            page_number UNINDEXED,
            text,
            content='pages',
            content_rowid='id'
        )
    """)
    
    # Match sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS match_sessions (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            notes_text TEXT NOT NULL,
            results_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def save_book(book_id: str, title: str, filename: str, file_path: str, total_pages: int, toc: list):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO books (id, title, filename, file_path, total_pages, toc_json)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (book_id, title, filename, file_path, total_pages, json.dumps(toc)))
    conn.commit()
    conn.close()

def save_page_batch(book_id: str, pages_data: List[Dict[str, Any]]):
    """
    pages_data is list of:
    {
       'page_number': int,
       'text': str,
       'lines': [{'line_number': int, 'text': str, 'bbox': [...]}, ...]
    }
    """
    conn = get_db()
    cursor = conn.cursor()
    
    for p in pages_data:
        page_num = p['page_number']
        page_text = p['text']
        lines = p.get('lines', [])
        
        cursor.execute("""
            INSERT OR REPLACE INTO pages (book_id, page_number, text, line_count)
            VALUES (?, ?, ?, ?)
        """, (book_id, page_num, page_text, len(lines)))
        
        page_rowid = cursor.lastrowid
        cursor.execute("""
            INSERT INTO pages_fts (rowid, book_id, page_number, text)
            VALUES (?, ?, ?, ?)
        """, (page_rowid, book_id, page_num, page_text))
        
        # Batch insert lines
        line_records = [
            (book_id, page_num, l['line_number'], l['text'], json.dumps(l.get('bbox', [])))
            for l in lines
        ]
        cursor.executemany("""
            INSERT INTO page_lines (book_id, page_number, line_number, text, bbox_json)
            VALUES (?, ?, ?, ?, ?)
        """, line_records)
        
    conn.commit()
    conn.close()

def get_all_books() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, filename, file_path, total_pages, toc_json, created_at FROM books ORDER BY created_at DESC")
    rows = cursor.fetchall()
    books = []
    for r in rows:
        books.append({
            "id": r["id"],
            "title": r["title"],
            "filename": r["filename"],
            "file_path": r["file_path"],
            "total_pages": r["total_pages"],
            "toc": json.loads(r["toc_json"]) if r["toc_json"] else [],
            "created_at": r["created_at"]
        })
    conn.close()
    return books

def get_book(book_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, filename, file_path, total_pages, toc_json, created_at FROM books WHERE id = ?", (book_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r["id"],
        "title": r["title"],
        "filename": r["filename"],
        "file_path": r["file_path"],
        "total_pages": r["total_pages"],
        "toc": json.loads(r["toc_json"]) if r["toc_json"] else [],
        "created_at": r["created_at"]
    }

def get_page_info(book_id: str, page_number: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT page_number, text, line_count FROM pages WHERE book_id = ? AND page_number = ?", (book_id, page_number))
    r = cursor.fetchone()
    if not r:
        conn.close()
        return None
    
    cursor.execute("""
        SELECT line_number, text, bbox_json FROM page_lines
        WHERE book_id = ? AND page_number = ?
        ORDER BY line_number ASC
    """, (book_id, page_number))
    line_rows = cursor.fetchall()
    lines = []
    for lr in line_rows:
        lines.append({
            "line_number": lr["line_number"],
            "text": lr["text"],
            "bbox": json.loads(lr["bbox_json"]) if lr["bbox_json"] else None
        })
        
    conn.close()
    return {
        "page_number": r["page_number"],
        "text": r["text"],
        "line_count": r["line_count"],
        "lines": lines
    }

def get_all_pages_for_search(book_id: str) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT page_number, text FROM pages WHERE book_id = ? ORDER BY page_number ASC", (book_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"page_number": r["page_number"], "text": r["text"]} for r in rows]

def get_page_lines(book_id: str, page_number: int) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT line_number, text, bbox_json FROM page_lines
        WHERE book_id = ? AND page_number = ?
        ORDER BY line_number ASC
    """, (book_id, page_number))
    rows = cursor.fetchall()
    conn.close()
    return [{
        "line_number": r["line_number"],
        "text": r["text"],
        "bbox": json.loads(r["bbox_json"]) if r["bbox_json"] else None
    } for r in rows]
