# 📖 BookMatcher AI — 1,000-Page Textbook & Notes Page Locator

> **Next.js + Node.js + MongoDB MVP**  
> An AI-powered fullstack web application that indexes massive (~1,000-page) textbooks and automatically discovers the **exact pages and lines** you need to study based on your classroom notes or lecture slide decks.

---

## 💡 The Core Problem
College students and engineers sit through lectures and take notes, but their textbooks are **800 to 1,200 pages long**. 
Finding which specific textbook pages, diagrams, and paragraphs align with today's lecture requires hours of manual flipping through indices and tables of contents.

---

## 🚀 The Solution & Key Features

1. **Massive ~1,000-Page Textbook Indexing**:
   - Page-by-page line coordinate extraction via Node.js (`pdf-parse`).
   - Ships with an instant **1,000-page comprehensive engineering textbook** (`Computer Systems & Software Architecture: 1,000-Page Comprehensive Edition`) with 10 chapters.
   - Allows uploading your own 1,000-page PDF textbooks with dynamic in-memory & database indexing.

2. **Classroom Notes Input**:
   - **Text / Markdown Notes Paste**: Paste raw lecture bullet points, syllabus topics, or exam review prompts.
   - **Lecture Slides Upload (PDF)**: Automatically parses PDF slide decks into structured notes.
   - **1-Click Sample Notes**: Pre-loaded with realistic OS, memory management, and distributed systems notes.

3. **Intelligent Page Discovery**:
   - **Exact Page Number Pinpointed**: e.g., *Turn to Page 142* or *Turn to Page 645*.
   - **Exact Line Range**: e.g., *Lines 2–5*.
   - **Verbatim Excerpt**: Direct quote from the textbook matching the note.
   - **Relevance Confidence & Explanation**: Why that textbook page addresses the lecture topic.
   - **Study Time Saved Metric**: Tells you how much time you save (e.g. *99.7% study time saved — only 3 pages out of 1,000 to read!*).

4. **Interactive In-App Textbook Page Reader**:
   - Inspect any textbook page directly in the application.
   - Matched lines are highlighted with glowing amber indicators so your eyes lock onto the exact concept immediately.
   - Next/previous page pagination for full textbook context.

5. **Clustered Study Sequence & Export**:
   - **Cluster by Textbook Page**: Groups all lecture notes covered by each page so you read Page 142 once, then proceed to Page 234.
   - **Consolidated Reading Checklist**: Check off pages as you study.
   - **Export Markdown Study Guide**: 1-click download of a formatted study checklist.

6. **MongoDB Integration**:
   - Mongoose schemas for Books, Pages, and Match Session Histories.
   - Seamless auto-fallback: Operates with zero setup in-memory, or connects to MongoDB / MongoDB Atlas when `MONGODB_URI` is provided in `.env.local`.
   - Real-time MongoDB status badge in the header.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Tailwind CSS, Lucide React, React 18
- **Framework**: Next.js 14 (App Router)
- **Backend**: Node.js Route Handlers (`app/api/*`)
- **Database ("Mango")**: MongoDB & Mongoose (with in-memory fallback)
- **Search & Retrieval**: In-memory BM25 multi-line sliding window alignment (`minisearch`)
- **AI Enhancement**: Optional Google Gemini API integration

---

## ⚡ Quickstart

### 1. Run Development Server:
```bash
cd /Users/uplakshyakumar/.gemini/antigravity/scratch/textbook-notes-matcher
npm run dev
# Or run production: npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 2. Configure MongoDB (Optional):
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your MongoDB connection string (e.g., MongoDB Atlas or local `mongodb://127.0.0.1:27017/textbook_notes_matcher`).
If left blank, the app runs smoothly with the built-in in-memory store.
