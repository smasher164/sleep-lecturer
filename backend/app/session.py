import uuid
from typing import Optional
from pydantic import BaseModel, Field


class SessionState(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    provider: str = "openai"
    segment_index: int = 0
    last_summary: Optional[str] = None
    continuation_seed: Optional[str] = None


# In-memory store for MVP
_sessions: dict[str, SessionState] = {}


def create_session(topic: str, provider: str = "openai") -> SessionState:
    session = SessionState(topic=topic, provider=provider)
    _sessions[session.session_id] = session
    return session


def get_session(session_id: str) -> Optional[SessionState]:
    return _sessions.get(session_id)


def update_session(session: SessionState) -> None:
    _sessions[session.session_id] = session
