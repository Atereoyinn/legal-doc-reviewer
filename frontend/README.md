# Doc Reviewer

An AI-powered legal document review app with full-text search, document classification, structured extraction, and risk analysis.

## Repository structure

- `app/` - Python backend (FastAPI)
- `src/` - React frontend (Vite)
- `.env` - local environment variables (should not be committed)
- `requirements.txt` - backend dependencies
- `package.json` - frontend dependencies
- `Procfile` - deployment entrypoint for Heroku-like platforms

## Local setup

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp app/.env .env
# Set OPENAI_API_KEY in .env or deploy environment
python3 -c "from app.db.database import init_db; init_db()"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
npm install
npm run dev
```

## Deployment notes

- Keep `OPENAI_API_KEY` out of GitHub and set it via environment variables.
- Use `VITE_API_BASE_URL` to point the frontend at the deployed backend.
- Ensure `app.db`, `.venv`, `node_modules/`, and `.env` are ignored.

## Recommended repo name

`doc-reviewer`
