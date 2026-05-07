import { useEffect, useState } from "react";
import { startSession } from "./api";
import { useAudioQueue } from "./hooks/useAudioQueue";
import { TopicForm } from "./components/TopicForm";
import { AudioPlayer } from "./components/AudioPlayer";
import styles from "./App.module.css";

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [provider, setProvider] = useState("openai");

  const {
    playing,
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
  } = useAudioQueue(sessionId);

  // Countdown — pauses when audio is paused, stops playback at 0
  useEffect(() => {
    if (timerSeconds === null || isPaused) return;

    if (timerSeconds === 0) {
      stop();
      setSessionId(null);
      setTimerSeconds(null);
      return;
    }

    const id = setTimeout(() => {
      setTimerSeconds((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);

    return () => clearTimeout(id);
  }, [timerSeconds, isPaused, stop]);

  async function handleStart(topic: string, timerMinutes: number, provider: string) {
    unlock();
    setLoading(true);
    setError(null);
    try {
      const first = await startSession(topic, provider);
      setSessionId(first.session_id);
      start(first);
      setTimerSeconds(timerMinutes * 60);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleStop() {
    stop();
    setSessionId(null);
    setTimerSeconds(null);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sleep Lecturer</h1>
        <p className={styles.subtitle}>AI academic lectures for passive listening</p>
      </header>

      {!playing && (
        <TopicForm
          onStart={handleStart}
          disabled={loading}
          timerMinutes={timerMinutes}
          onTimerChange={setTimerMinutes}
          provider={provider}
          onProviderChange={setProvider}
        />
      )}

      {loading && <p className={styles.status}>Generating first segment…</p>}
      {error && <p className={styles.error}>{error}</p>}

      <AudioPlayer
        playing={playing}
        isPaused={isPaused}
        timerSeconds={timerSeconds}
        volume={volume}
        ambianceVolume={ambianceVolume}
        onPause={pause}
        onResume={resume}
        onStop={handleStop}
        onVolumeChange={setVolume}
        onAmbianceVolumeChange={setAmbianceVolume}
      />

      <footer className={styles.footer}>
        <a
          href="https://github.com/smasher164/sleep-lecturer"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          GitHub
        </a>
        <span className={styles.footerSep}>·</span>
        <span>© Akhil Indurti 2026</span>
      </footer>
    </main>
  );
}
