## KREDO

KREDO is a simple misinformation-checking prototype with a FastAPI backend and a React + Vite frontend.

## Project layout

- `backend/` - API, agents, services, and configs
- `frontend/` - React UI
- `extension/` - Chrome extension

## Requirements

- Python 3.10+
- Node.js 16+

## Run the backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
python backend/main.py
```

Or with Uvicorn:

```bash
uvicorn backend.main:app --reload --port 8000
```

Create `backend/.env` with the API keys your setup needs.

## Run the frontend

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
