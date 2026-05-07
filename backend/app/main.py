import asyncio
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import openai
from elevenlabs.core import ApiError as ElevenLabsAPIError

from app.config import settings
from app.session import create_session, get_session, update_session
from app.generate_text import generate_transcript, extract_summary_seed
from app.generate_audio import synthesize

app = FastAPI(title="Sleep Lecturer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.audio_cache_dir, exist_ok=True)
app.mount("/audio", StaticFiles(directory=settings.audio_cache_dir), name="audio")


class StartRequest(BaseModel):
    topic: str


class SegmentResponse(BaseModel):
    session_id: str
    segment_index: int
    audio_url: str
    transcript: str


def _api_error(e: Exception) -> HTTPException:
    if isinstance(e, openai.RateLimitError):
        return HTTPException(502, "OpenAI rate limit reached — try again shortly")
    if isinstance(e, openai.AuthenticationError):
        return HTTPException(502, "OpenAI authentication failed — check OPENAI_API_KEY")
    if isinstance(e, openai.APIConnectionError):
        return HTTPException(502, f"OpenAI connection error: {e}")
    if isinstance(e, openai.APIStatusError):
        return HTTPException(502, f"OpenAI error {e.status_code}: {e.message}")
    if isinstance(e, ElevenLabsAPIError):
        detail = e.body.get("detail") if isinstance(e.body, dict) else None
        msg = detail.get("message") if isinstance(detail, dict) else str(e)
        return HTTPException(502, f"ElevenLabs error: {msg}")
    return HTTPException(500, f"Unexpected error: {e}")


@app.post("/session/start", response_model=SegmentResponse)
async def start_session(body: StartRequest) -> SegmentResponse:
    session = create_session(topic=body.topic)
    try:
        # Short opener so first audio is ready quickly; synthesis + summary run in parallel
        transcript = await generate_transcript(session, settings.opening_word_count)
        file_path, (summary, seed) = await asyncio.gather(
            synthesize(transcript, session.session_id, session.segment_index),
            extract_summary_seed(transcript),
        )
    except Exception as e:
        raise _api_error(e)

    session.last_summary = summary
    session.continuation_seed = seed
    session.segment_index += 1
    update_session(session)

    audio_url = f"/audio/{session.session_id}/0.mp3"
    return SegmentResponse(
        session_id=session.session_id,
        segment_index=0,
        audio_url=audio_url,
        transcript=transcript,
    )


@app.get("/session/{session_id}/next", response_model=SegmentResponse)
async def next_segment(session_id: str) -> SegmentResponse:
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    idx = session.segment_index
    try:
        transcript = await generate_transcript(session, settings.segment_word_count)
        file_path, (summary, seed) = await asyncio.gather(
            synthesize(transcript, session_id, idx),
            extract_summary_seed(transcript),
        )
    except Exception as e:
        raise _api_error(e)

    session.last_summary = summary
    session.continuation_seed = seed
    session.segment_index += 1
    update_session(session)

    audio_url = f"/audio/{session_id}/{idx}.mp3"
    return SegmentResponse(
        session_id=session_id,
        segment_index=idx,
        audio_url=audio_url,
        transcript=transcript,
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# Serve built frontend — must be mounted last so API routes take priority
_static = Path(__file__).parent.parent / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="frontend")
