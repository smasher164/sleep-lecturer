import os
import aiofiles
from elevenlabs.client import AsyncElevenLabs
from elevenlabs.types import VoiceSettings
from app.config import settings

client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)


async def synthesize(transcript: str, session_id: str, segment_index: int) -> str:
    """Synthesizes transcript to MP3, returns relative file path."""
    out_dir = os.path.join(settings.audio_cache_dir, session_id)
    os.makedirs(out_dir, exist_ok=True)
    file_path = os.path.join(out_dir, f"{segment_index}.mp3")

    audio_stream = client.text_to_speech.convert(
        voice_id="SGyVje939dfQUkHcRrTB",
        text=transcript,
        model_id="eleven_turbo_v2_5",
        voice_settings=VoiceSettings(
            stability=0.35,
            similarity_boost=0.75,
            style=0.60,
            use_speaker_boost=True,
            speed=0.87,
        ),
    )

    async with aiofiles.open(file_path, "wb") as f:
        async for chunk in audio_stream:
            await f.write(chunk)

    return file_path
