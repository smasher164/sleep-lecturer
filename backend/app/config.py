from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str
    elevenlabs_api_key: str

    audio_cache_dir: str = "audio_cache"
    openai_model: str = "gpt-4o-mini"
    opening_word_count: int = 100   # short opener so first audio is ready fast (~45s)
    segment_word_count: int = 220   # ~90s at professor pace with pauses


settings = Settings()
