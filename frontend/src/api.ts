const BASE = "";

export interface SegmentResponse {
  session_id: string;
  segment_index: number;
  audio_url: string;
  transcript: string;
}

export async function startSession(topic: string): Promise<SegmentResponse> {
  const res = await fetch(`${BASE}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error("Failed to start session");
  return res.json();
}

export async function fetchNextSegment(
  sessionId: string
): Promise<SegmentResponse> {
  const res = await fetch(`${BASE}/session/${sessionId}/next`);
  if (!res.ok) throw new Error("Failed to fetch next segment");
  return res.json();
}
