# 📖 BookMatcher AI — Next.js Study Page & Line Pinpointer

> **Hackathon Submission Project**  
> An AI-powered fullstack Next.js web application that indexes massive (~1,000-page) textbooks and automatically discovers the **exact pages and lines** you need to study based on your classroom notes or lecture slide decks.

---

## 💡 The Problem
Students often sit through lectures and take notes, but textbooks are 800 to 1,200 pages long. Finding which specific textbook pages, diagrams, and paragraphs align with today's lecture requires hours of manual flipping through indices and tables of contents.

## 🚀 The Solution
**BookMatcher AI** bridges classroom lectures and massive textbooks:
1. **Upload Textbook (~1,000 pages)**: Fast page and line coordinate indexing via pure Node.js (`pdf-parse`).
2. **Input Notes**: Paste text or **upload lecture slides in PDF format**.
3. **Instant Exact Page Finder**: Enter any concept or question to immediately get:
   - **The exact page to study** (e.g. `Turn to Page 6`)
   - **Exact line numbers** (e.g. `Lines 2–4`)
   - **Verbatim textbook excerpt**
   - **Live In-App Textbook Page View with glowing amber line highlights**
4. **1,000-Page Distribution Heatmap & Checklist**: Visual distribution of required reading, saving **80–98% of reading time**.

---

## 🛠️ Fullstack Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18, HTML5, CSS3, Tailwind CSS, Lucide React
- **Backend / APIs**: Node.js Route Handlers (`app/api/*`)
- **PDF Extraction**: `pdf-parse` (pure JavaScript/Node.js)
- **Retrieval Engine**: `minisearch` (in-memory BM25 full-text search) + JavaScript multi-line sliding-window alignment
- **AI Enhancement**: Optional Google Gemini API integration

---

## ⚡ Quickstart

### Run Locally:
```bash
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

### 1-Click Deploy on Vercel:
Push this repo to GitHub and import it on [Vercel](https://vercel.com) for instant free 24/7 cloud hosting!
