# Sleep Lecturer

AI academic lectures for passive listening and sleep. Enter a topic and the app continuously generates calm, meandering lecture audio — powered by OpenAI for transcripts and ElevenLabs for text-to-speech.

Live at: https://sleep-lecturer.fly.dev

## How it works

The app is segment-based: the backend generates a 60–120s transcript, synthesizes it to audio via ElevenLabs, and the frontend queues and plays segments sequentially while prefetching the next one.

## Running locally

### Prerequisites

- [Nix](https://nixos.org) with flakes enabled (provides Python, Node, overmind)
- Or manually: Python 3.11+, Node 20+, [overmind](https://github.com/DarthSim/overmind)

### 1. Environment variables

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk_...
```

#### Optional: local model via Ollama

To add a local model option alongside OpenAI, install [Ollama](https://ollama.com), pull a model, and add two more variables:

```
LOCAL_BASE_URL=http://localhost:11434/v1
LOCAL_MODEL=llama3.2
```

When `LOCAL_BASE_URL` is set, a **Model** pill row appears in the UI letting you switch between OpenAI and the local model per session.

### 2. Install dependencies

```bash
# Backend
cd backend && pip install -e ".[dev]" && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Start both servers

```bash
./run-local
```

This starts the FastAPI backend (port 8000), the Vite frontend (port 5173), and Ollama (if not already running) together via overmind. `Ctrl+C` stops everything cleanly.

To start them separately:

```bash
# Backend
cd backend && .venv/bin/uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev
```

The frontend proxies `/session` and `/audio` requests to the backend, so open http://localhost:5173.

## Deploying to Fly.io

The app is deployed as a single Docker container — the frontend is compiled at build time and served as static files by the FastAPI backend.

### First-time setup

```bash
fly auth login
fly launch          # only needed once; fly.toml is already configured
fly secrets set OPENAI_API_KEY=sk-... ELEVENLABS_API_KEY=sk_...
```

### Redeploy after changes

```bash
fly deploy
```

The live app will be at https://sleep-lecturer.fly.dev.
