from openai import AsyncOpenAI
from app.config import settings
from app.session import SessionState

client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """\
You are an older male professor at a research university, delivering a live lecture at an \
academic conference on a niche area in which you are actively publishing. Think Noam Chomsky: \
unhurried, precise, occasionally digressive in a way that rewards attention. You motivate ideas \
carefully so the listener never feels dropped mid-thought.

The recording captures the ambience of a university lecture hall — faint murmur, the occasional \
scrape of a chair, papers rustling. Once in a while an organizer adjusts your microphone and you \
respond with a dry self-deprecating aside that earns a scatter of quiet laughs. These moments are \
rare and natural.

CRITICAL — this is a LIVE, AD-HOC lecture, not a written document read aloud. Write it that way:
- The professor thinks on his feet. He starts sentences and redirects them mid-stream.
- He uses filler and hedging naturally: "sort of", "in a sense", "what I mean is", "roughly".
- He refers to the audience: "those of you who've worked with X will recognize...", "I suspect \
  some of you are thinking...".
- He checks in with himself: "Now where was I... right." or "Let me back up for a moment."
- He repeats a key word or phrase slightly differently to let it settle, the way speakers do.
- Sentences vary wildly in length. A long, winding clause. Then three words. Then on.

PAUSES AND RHYTHM — use the following signals, which the TTS system interprets directly:
- Short thinking pause: ... (ellipsis)
- Longer beat between thoughts: <break time="1.5s" />
- Major transition between topics: <break time="2.5s" />
- Throat clearing or collecting himself (use sparingly, once or twice per segment): \
  write "Ahem." or "Mm." as a standalone sentence before continuing.

Do not use any other markup or formatting. No bullet points, headers, or labels. \
Target {word_count} words. Output only the spoken text exactly as it would be heard on the \
recording.
"""

CONTINUATION_PROMPT = """\
Topic: {topic}
What was just covered: {summary}
Continue naturally from: "{seed}"

Continue the lecture. Do not repeat what was already said. Develop the next idea as the \
professor would — motivating it, unpacking it, occasionally connecting it back to something \
said earlier. Keep the hall ambience and the professor's voice consistent.
"""

OPENING_PROMPT = """\
Topic: {topic}

Open the lecture. The professor has just been introduced and steps to the podium. He thanks \
the organizers briefly, then settles into his first substantive point — grounding the audience \
in why this topic matters and what angle he will take. Do not jump straight into dense content; \
earn the listener's attention first.
"""


async def generate_transcript(session: SessionState, word_count: int) -> str:
    """Generate the spoken lecture text for one segment."""
    system = SYSTEM_PROMPT.format(word_count=word_count)

    if session.last_summary and session.continuation_seed:
        user = CONTINUATION_PROMPT.format(
            topic=session.topic,
            summary=session.last_summary,
            seed=session.continuation_seed,
        )
    else:
        user = OPENING_PROMPT.format(topic=session.topic)

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.9,
    )
    text = (response.choices[0].message.content or "").strip()
    # Trailing pause so segment boundaries feel like a natural breath, not a cut
    return text + ' <break time="2s" />'


async def extract_summary_seed(transcript: str) -> tuple[str, str]:
    """Extract a 2-3 sentence summary and continuation seed from a transcript."""
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Summarize the following narration in 2–3 sentences, "
                    f"then on a new line write 'SEED:' followed by the last sentence "
                    f"of the narration verbatim.\n\n{transcript}"
                ),
            }
        ],
        temperature=0.3,
    )
    raw = (response.choices[0].message.content or "").strip()
    if "SEED:" in raw:
        summary, _, seed = raw.partition("SEED:")
        return summary.strip(), seed.strip()
    seed = transcript.split(".")[-2].strip() if transcript.count(".") >= 2 else transcript
    return raw, seed
