<div align="center">
  <h1>KREDO</h1>
  <p><strong>A Multi-Agent Fake News Detection & Fact-Checking Ecosystem</strong></p>

  <p>
    <img alt="Python" src="https://img.shields.io/badge/Python-3.10+-blue.svg?style=for-the-badge&logo=python&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react&logoColor=white" />
    <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.100+-blue.svg?style=for-the-badge&logo=fastapi&logoColor=white" />
    <img alt="LangGraph" src="https://img.shields.io/badge/LangGraph-Agentic-blue.svg?style=for-the-badge&logo=graphql&logoColor=E10098" />
  </p>
</div>

<hr />

## 🌟 Overview

**KREDO** is a lightweight, high-precision fake-news detection and fact-checking application. It takes a URL, article text, or image and analyzes it through an advanced multi-agent fact-checking pipeline. 

The application provides a sleek, clinical UI featuring live progress updates, comprehensive source citations, final credibility verdicts, and a verifiable history of past analyses.

---

## 🏗️ Architecture

KREDO is built as a three-part ecosystem:

- 🧠 **Backend (`backend/`)**: FastAPI-based API and the core agent pipeline powered by LangGraph.
- 🎨 **Frontend (`frontend/`)**: Modern React + Vite UI demonstrating the "Verifiable Intelligence" design language.
- 🧩 **Extension (`extension/`)**: A Chrome extension for instant URL checking directly from your browser.

### Backend Environment

Create a `backend/.env` file before running the API. The app reads these variables at startup:

```env
# Core LLM + retrieval keys
GROQ_API_KEY=
TAVILY_API_KEY=
JINA_READER_API_KEY=
SARVAM_API_KEY=

# Optional multilingual controls
SARVAM_API_BASE=https://api.sarvam.ai
MULTILINGUAL_ENABLED=true
MULTILINGUAL_MIN_CONFIDENCE=0.7

# Optional history protection
HISTORY_API_KEY=

# Supabase history store
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Alternate Supabase-style names supported by the current codebase
project_url_supabase=
secret_key_supabase=
publishable_key_supabase=
anon_key_supabase=
```

If you want the history feature enabled, the Supabase URL and service role key are required. If you only want the analysis pipeline, the app can still run without the history store, but history endpoints will be unavailable.

---

## 🕵️‍♂️ The 5-Agent Pipeline

KREDO orchestrates a fixed pipeline of specialized agents. The backend streams each step via LangGraph, enabling real-time UI updates:

1. **Claim Extraction**: Isolates core claims from the provided text, image, or URL.
2. **Evidence Retrieval**: Gathers supporting or refuting evidence across the web.
3. **Source Credibility Scoring**: Evaluates the reliability and bias of the sources.
4. **Fact Checking**: Cross-references claims against the retrieved evidence.
5. **Explanation Generation**: Synthesizes a clear, human-readable final verdict.

### Models and Providers

The current project uses a small set of model providers rather than a single monolithic LLM:

| Stage | Provider | Model |
| --- | --- | --- |
| Claim Extraction | Groq | `llama-3.1-8b-instant` |
| Evidence Query Enrichment | Groq | `llama-3.1-8b-instant` |
| Fact Checker Reasoning | Groq | `llama-3.1-8b-instant` |
| Fact Checker Verdict | Groq | `llama-3.3-70b-versatile` |
| Explanation Generation | Groq | `llama-3.1-8b-instant` |
| Image OCR Translation | Groq | `llama-3.3-70b-versatile` |
| URL-to-Markdown Scraping | Jina Reader | API-based service |
| Web Search | Tavily | API-based service |
| Multilingual Detection / Translation | Sarvam AI | API-based service |
| History Storage | Supabase | Postgres-backed table |

Source credibility scoring is handled locally in code and does not call an external model.

---

## ✨ Features

- **Multi-Modal Input:** Support for text, URL, and image analysis.
- **Real-Time Progress:** Watch the 5-agent pipeline think and execute in real-time.
- **Verifiable Intelligence UI:** A high-precision, clinical interface built for trust and clarity.
- **Seamless Browser Integration:** One-click checking via the Chrome Extension.
- **History Tracking:** Save and review past credibility analyses.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 16+

### 1. Backend Setup

Create `backend/.env` first and add the keys listed above.

```bash
# Navigate to the project root
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start the FastAPI server
python backend/main.py
```

### 2. Frontend Setup

Open a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Visit the local Vite URL, typically `http://localhost:5173`.

### 3. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `extension/` folder from this repository.
5. The KREDO extension is now ready to use!

---

## 🛠️ Notes

- **Security:** Ensure that `.env` files and secrets are never committed to Git.
- **Line Endings:** If Git warns about line endings on Windows, ensure you have a `.gitattributes` file with `* text=auto`.

<br/>
<div align="center">
  <sub>Built with ❤️ for a more truthful web.</sub>
</div>
