# 📖 BookMatcher AI — Intelligent Study Page & Line Pinpointer

> **Hackathon Submission Project**  
> An AI-powered study platform that indexes massive (~1,000-page) textbooks and automatically discovers the **exact pages and lines** you need to study based on your classroom notes or lecture slides.

---

## 💡 The Problem
Students often sit through lectures and take notes, but textbooks are 800 to 1,200 pages long. Finding which specific textbook pages, diagrams, and paragraphs align with today's lecture requires hours of manual flipping through indices and tables of contents.

## 🚀 The Solution
**BookMatcher AI** bridges classroom lectures and massive textbooks:
1. **Upload Textbook (~1,000 pages)**: Fast page and line indexing via PyMuPDF.
2. **Input Notes**: Paste text or **upload lecture slides in PDF format**.
3. **Instant Exact Page Finder**: Enter any concept or question to immediately get:
   - **The exact page to study** (e.g. `Turn to Page 6`)
   - **Exact line numbers** (e.g. `Lines 2–4`)
   - **Verbatim textbook excerpt**
   - **Live In-App Textbook Page View with glowing amber line highlights**
4. **1,000-Page Distribution Heatmap & Checklist**: Visual distribution of required reading, saving **80–98% of reading time**.

---

## 🛠️ Architecture & Tech Stack
- **Backend**: FastAPI (Python 3.12)
- **PDF & Line Extraction**: PyMuPDF (`fitz`) with coordinate bounding boxes
- **Retrieval Engine**: SQLite FTS5 BM25 + High-Precision Term-Frequency Alignment
- **AI Enhancement**: Optional Google Gemini API integration
- **Frontend**: Responsive Single-Page Application (Tailwind CSS + Lucide Icons)

---

## ⚡ Quickstart

### Run Locally:
```bash
./run.sh
# Open http://localhost:8000 in your browser
```

### Docker:
```bash
docker build -t bookmatcher .
docker run -p 8000:8000 bookmatcher
```
