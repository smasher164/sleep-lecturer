import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNextSegment, SegmentResponse } from "../api";

const BUFFER_TARGET = 2;

export function useAudioQueue(sessionId: string | null) {
  const [queue, setQueue] = useState<SegmentResponse[]>([]);
  const [playing, setPlaying] = useState<SegmentResponse | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolumeState] = useState(1.0);
  const [ambianceVolume, setAmbianceVolumeState] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambianceRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<{ url: string; audio: HTMLAudioElement } | null>(null);

  const enqueue = useCallback(
    async (id: string) => {
      if (isFetching) return;
      setIsFetching(true);
      try {
        const segment = await fetchNextSegment(id);
        setQueue((q) => [...q, segment]);
      } finally {
        setIsFetching(false);
      }
    },
    [isFetching]
  );

  // Keep buffer topped up (only when playing, not paused)
  useEffect(() => {
    if (!sessionId || isPaused) return;
    if (queue.length < BUFFER_TARGET && !isFetching) {
      enqueue(sessionId);
    }
  }, [sessionId, queue.length, isFetching, isPaused, enqueue]);

  // Advance to next segment when audio ends
  const onEnded = useCallback(() => {
    setQueue((q) => {
      const [next, ...rest] = q;
      setPlaying(next ?? null);
      return rest;
    });
  }, []);

  // Recovery: if playback stalled because the queue was empty when a segment ended,
  // restart as soon as the next segment arrives.
  useEffect(() => {
    if (!sessionId || isPaused || playing !== null || queue.length === 0) return;
    setQueue((q) => {
      const [next, ...rest] = q;
      setPlaying(next ?? null);
      return rest;
    });
  }, [sessionId, isPaused, playing, queue]);

  // Preload next segment's audio while current plays to eliminate gap at transition
  const nextUrl = queue[0]?.audio_url;
  useEffect(() => {
    if (!nextUrl) return;
    const audio = new Audio(nextUrl);
    preloadRef.current = { url: nextUrl, audio };
  }, [nextUrl]);

  // Wire up main audio element
  useEffect(() => {
    if (!playing) return;
    const pre = preloadRef.current;
    const audio = pre?.url === playing.audio_url ? pre.audio : new Audio(playing.audio_url);
    if (pre?.url === playing.audio_url) preloadRef.current = null;
    audioRef.current = audio;
    audio.volume = volume;
    audio.onended = onEnded;
    audio.play().catch(console.error);
    return () => {
      audio.onended = null;
    };
  }, [playing, onEnded]); // volume intentionally omitted — separate effect handles it

  // Sync volume changes to audio elements live
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (ambianceRef.current) ambianceRef.current.volume = ambianceVolume;
  }, [ambianceVolume]);

  const start = useCallback(
    (firstSegment: SegmentResponse) => {
      const ambiance = new Audio("/ambiance.mp3");
      ambiance.loop = true;
      ambiance.volume = ambianceVolume;
      ambianceRef.current = ambiance;
      ambiance.play().catch(console.error);
      setPlaying(firstSegment);
      setQueue([]);
      setIsPaused(false);
    },
    [ambianceVolume]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    ambianceRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.error);
    ambianceRef.current?.play().catch(console.error);
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    ambianceRef.current?.pause();
    ambianceRef.current = null;
    setPlaying(null);
    setQueue([]);
    setIsPaused(false);
  }, []);

  const setVolume = useCallback((v: number) => setVolumeState(v), []);
  const setAmbianceVolume = useCallback((v: number) => setAmbianceVolumeState(v), []);

  return {
    playing,
    queue,
    isPaused,
    volume,
    ambianceVolume,
    start,
    pause,
    resume,
    stop,
    setVolume,
    setAmbianceVolume,
  };
}
