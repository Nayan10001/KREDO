## KREDO

KREDO is a lightweight fake-news detection and fact-checking app with three parts:

- `backend/` for the FastAPI API and agent pipeline
- `frontend/` for the React + Vite UI
- `extension/` for the Chrome extension

## What it does

The app takes a URL, article text, or image and checks it through a multi-agent fact-checking flow. The UI shows a chat-style analysis view with live progress updates, a final credibility result, source citations, and saved history.

## Agent orchestration

KREDO uses 5 agents in a fixed pipeline:

1. Claim extraction
2. Evidence retrieval
3. Source credibility scoring
4. Fact checking
5. Explanation generation

The backend streams each step through LangGraph so the frontend can show progress as the analysis runs.

## Backend, frontend, and extension

- Backend: FastAPI app in `backend/main.py` with the agent graph and analysis endpoints.
- Frontend: React app in `frontend/` with the main chat UI, history panel, and result cards.
- Extension: Chrome extension in `extension/` that sends a page URL to the app for quick checks.

## Requirements

- Python 3.10+
- Node.js 16+

## Run locally

Backend:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
python backend/main.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Chrome extension

Load the `extension/` folder as an unpacked extension in Chrome Developer mode.

## Notes

- Keep secrets out of Git.
- If Git warns about line endings on Windows, add a `.gitattributes` file with `* text=auto`.
