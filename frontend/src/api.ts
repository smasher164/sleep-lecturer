const BASE = "";

export interface SegmentResponse {
  session_id: string;
  segment_index: number;
  audio_url: string;
  transcript: string;
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error("Backend not reachable — is the server running?");
  }
}

async function checkResponse(res: Response, fallback: string): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (!text) {
      throw new Error("Backend not reachable — is the server running?");
    }
    let message = fallback;
    try {
      const body = JSON.parse(text);
      const detail = body?.detail;
      message = typeof detail === "string" ? detail : JSON.stringify(body);
    } catch {
      message = text;
    }
    throw new Error(message);
  }
}

export async function startSession(topic: string): Promise<SegmentResponse> {
  const res = await apiFetch(`${BASE}/session/start`, {
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
  const res = await apiFetch(`${BASE}/session/${sessionId}/next`);
  await checkResponse(res, "Failed to fetch next segment");
  return res.json();
}
