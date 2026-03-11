# Health Agent

`Health Agent` is a three-service scaffold for a Chinese-market health and fitness coaching product:

- `frontend/`: Next.js App Router UI
- `backend/`: NestJS API for auth, profile, logs, plans, exercises, and dashboard
- `agent-service/`: Python FastAPI service for OpenAI-compatible LLM orchestration, tool calling, session persistence, trace logging, and SSE replay

## Current state

This repository now contains an implementation-oriented scaffold of the previously planned architecture:

- Chat-first UX with dashboard, plan, logs, exercise, and profile pages
- Backend API shape aligned to the product plan
- Python agent runtime with:
  - OpenAI-compatible client abstraction
  - Multi-agent style routing
  - Tool gateway
  - Session store
  - Trace logging
  - SSE event streaming
  - AMap tool integration hook

## Local development

1. Copy `.env.example` to `.env` and fill secrets.
2. Install dependencies:

```bash
npm install
```

3. Create the Python environment. Either `venv` or `conda` is fine:

```bash
cd agent-service
python -m venv .venv
```

or

```bash
conda create -n health-agent python=3.10 -y
conda activate health-agent
cd agent-service
```

4. Install Python dependencies:

```bash
cd agent-service
pip install -e .
```

5. Run services in separate terminals:

```bash
npm run dev:frontend
npm run dev:backend
cd agent-service && uvicorn app.main:app --reload --port 8000
```

## Notes

- The backend now uses Prisma with PostgreSQL persistence instead of the earlier in-memory scaffold.
- The agent service falls back to deterministic mock responses if no LLM credentials are configured.
- End-user visible reasoning is a sanitized summary only. Raw chain-of-thought is not exposed.
