# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sleep Lecturer is a web app that generates an infinite AI lecture/podcast audio stream for passive listening and sleep. Users enter a topic (e.g., "Roman history") and the app continuously generates calm, meandering transcript segments, synthesizes them to audio via ElevenLabs, and streams them sequentially in the browser.

## Architecture

The system is segment-based, not true streaming. The loop is:
1. Backend generates a 60–120s transcript segment via OpenAI
2. Backend synthesizes the segment to audio via ElevenLabs TTS
3. Frontend fetches and queues the next audio chunk, keeping 1–3 buffered ahead
4. Session state (topic, tone, summary, continuation seed) persists server-side per session

```
flake.nix                   # Nix dev environment

backend/
  pyproject.toml
  .env                      # (gitignored) — copy from .env.example
  app/
    main.py                 # FastAPI app, routes: POST /session/start, GET /session/{id}/next
    config.py               # pydantic-settings (reads .env)
    session.py              # SessionState model + in-memory session store
    generate_text.py        # OpenAI transcript generation
    generate_audio.py       # ElevenLabs TTS synthesis → audio_cache/
  audio_cache/              # generated MP3s served as static files (gitignored)

frontend/
  index.html
  vite.config.ts            # proxies /session and /audio to localhost:8000
  src/
    main.tsx
    App.tsx
    api.ts                  # typed fetch wrappers (startSession, fetchNextSegment)
    hooks/
      useAudioQueue.ts      # buffer management + Audio element wiring
    components/
      TopicForm.tsx
      AudioPlayer.tsx
```

## Dev Environment Setup

Uses Nix flakes for reproducible environments.

```bash
nix develop          # enter dev shell (installs Python, Node, etc.)
```

### Backend

```bash
cd backend
pip install -e ".[dev]"   # or: uv pip install -e ".[dev]"
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` in `backend/`:

```
OPENAI_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...   # pick a calm, neutral voice
SESSION_SECRET=...
```

## Key Commands

| Task | Command |
|------|---------|
| Start all (local dev) | `./run-local` |
| Start backend | `uvicorn backend.main:app --reload` |
| Start frontend | `cd frontend && npm run dev` |
| Run backend tests | `pytest` |
| Run a single test | `pytest tests/test_generator.py::test_segment_length` |
| Type-check backend | `mypy backend/` |
| Lint backend | `ruff check backend/` |
| Format backend | `ruff format backend/` |
| Lint/type frontend | `npm run lint` / `npm run typecheck` |
| Build frontend | `npm run build` |

## Coding Conventions

### Backend (Python)
- Python 3.11+, FastAPI, async throughout (use `async def` for all route handlers and service calls)
- Pydantic v2 for all data models and config
- Use `pydantic-settings` for env var management in `config.py`
- Keep services stateless; session state lives in a server-side dict keyed by session ID (in-memory for MVP)
- Audio files written to `audio_cache/{session_id}/{segment_index}.mp3`; serve them as static files or via a `/audio/{file}` endpoint

### Frontend (TypeScript)
- Strict TypeScript (`"strict": true` in tsconfig)
- `useAudioQueue` hook manages the buffer: fetches next chunk when queue drops below 2
- Polling or a simple interval triggers chunk prefetch — no WebSockets needed for MVP
- Keep components small; logic in hooks

### Prompt Design
- Transcripts must be calm, meandering, low-stakes, and sleep-friendly — no dramatic reveals, cliffhangers, or urgent calls to action
- Each generation call receives: topic, tone, a 2–3 sentence summary of what was just said, and a continuation seed phrase
- Target 150–300 words per segment (~60–120s at a slow TTS pace)
- System prompt should explicitly instruct the model to write as if for a sleepy listener: slow pacing, gentle transitions, no lists or bullet-point structure

### Audio
- Do not imitate real people's voices or use cloned voices without consent
- Use a pre-approved ElevenLabs voice ID from env config
- ElevenLabs response is streamed to disk, then the file path is returned to the frontend

## MVP Implementation Priorities

1. `POST /session/start` — accepts topic + tone, returns session ID and first segment audio URL
2. `GET /audio/next?session_id=...` — generates next transcript + synthesizes audio, returns URL
3. Frontend `useAudioQueue` — fetches and plays chunks in sequence, prefetches next
4. Basic `TopicForm` UI — topic input, start button, audio player
5. Session state continuity — summary + seed passed into each generation call
6. Sleep timer (client-side countdown that stops fetching new chunks)

## What to Avoid (MVP Scope)

- Auth, user accounts, payments
- Database (use in-memory session dict)
- S3/R2 (use local `audio_cache/`)
- True token-streaming or real-time audio synthesis
- Overengineered queue systems — a simple asyncio queue per session is enough
