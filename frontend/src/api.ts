const BASE = "";

export interface SegmentResponse {
  session_id: string;
  segment_index: number;
  audio_url: string;
  transcript: string;
}

async function checkResponse(res: Response, fallback: string): Promise<void> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? fallback);
  }
}

export async function startSession(topic: string): Promise<SegmentResponse> {
  const res = await fetch(`${BASE}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  await checkResponse(res, "Failed to start session");
  return res.json();
}

export async function fetchNextSegment(
  sessionId: string
): Promise<SegmentResponse> {
  const res = await fetch(`${BASE}/session/${sessionId}/next`);
  await checkResponse(res, "Failed to fetch next segment");
  return res.json();
}
