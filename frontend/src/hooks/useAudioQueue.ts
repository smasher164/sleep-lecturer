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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const ambianceGainRef = useRef<GainNode | null>(null);
  // URL of the audio element already started by start() — play effect skips re-setup for it
  const startedUrlRef = useRef<string | null>(null);

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

    // iOS Safari: start() already connected and started this element synchronously
    // within the user-gesture call stack. Just attach onEnded and return.
    if (startedUrlRef.current === playing.audio_url && audioRef.current) {
      const audio = audioRef.current;
      audio.onended = onEnded;
      startedUrlRef.current = null;
      return () => { audio.onended = null; };
    }

    const pre = preloadRef.current;
    const audio = pre?.url === playing.audio_url ? pre.audio : new Audio(playing.audio_url);
    if (pre?.url === playing.audio_url) preloadRef.current = null;
    audioRef.current = audio;
    audio.onended = onEnded;

    const ctx = audioCtxRef.current;
    const gain = voiceGainRef.current;
    if (ctx && gain) {
      try {
        ctx.createMediaElementSource(audio).connect(gain);
      } catch {
        // Already connected — safe to ignore
      }
    }

    audio.play().catch(console.error);
    return () => { audio.onended = null; };
  }, [playing, onEnded]);

  // Sync volume changes through gain nodes (falls back to .volume on desktop)
  useEffect(() => {
    if (voiceGainRef.current) voiceGainRef.current.gain.value = volume;
    else if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (ambianceGainRef.current) ambianceGainRef.current.gain.value = ambianceVolume;
    else if (ambianceRef.current) ambianceRef.current.volume = ambianceVolume;
  }, [ambianceVolume]);

  // Resume AudioContext when the user returns to the tab/app after backgrounding
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        audioCtxRef.current?.resume().catch(console.error);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Call synchronously in the button handler before any await to unlock AudioContext
  // on iOS Safari — the user-gesture context does not survive an await boundary.
  const unlock = useCallback(() => {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    ctx.resume().catch(console.error);
  }, []);

  const start = useCallback(
    (firstSegment: SegmentResponse) => {
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      ctx.resume().catch(console.error);

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = volume;
      voiceGain.connect(ctx.destination);
      voiceGainRef.current = voiceGain;

      // Start the first voice segment here, synchronously, so iOS Safari allows
      // play() without a fresh user gesture.
      const voiceAudio = new Audio(firstSegment.audio_url);
      ctx.createMediaElementSource(voiceAudio).connect(voiceGain);
      audioRef.current = voiceAudio;
      startedUrlRef.current = firstSegment.audio_url;
      voiceAudio.play().catch(console.error);

      const ambiance = new Audio("/ambiance.mp3");
      ambiance.loop = true;
      ambianceRef.current = ambiance;
      const ambianceGain = ctx.createGain();
      ambianceGain.gain.value = ambianceVolume;
      ctx.createMediaElementSource(ambiance).connect(ambianceGain);
      ambianceGain.connect(ctx.destination);
      ambianceGainRef.current = ambianceGain;
      ambiance.play().catch(console.error);

      setPlaying(firstSegment);
      setQueue([]);
      setIsPaused(false);
    },
    [volume, ambianceVolume]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    ambianceRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    audioCtxRef.current?.resume().catch(console.error);
    audioRef.current?.play().catch(console.error);
    ambianceRef.current?.play().catch(console.error);
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    ambianceRef.current?.pause();
    ambianceRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    voiceGainRef.current = null;
    ambianceGainRef.current = null;
    startedUrlRef.current = null;
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
    unlock,
    start,
    pause,
    resume,
    stop,
    setVolume,
    setAmbianceVolume,
  };
}
