import { SegmentResponse } from "../api";
import styles from "./AudioPlayer.module.css";

interface Props {
  playing: SegmentResponse | null;
  isPaused: boolean;
  timerSeconds: number | null;
  volume: number;
  ambianceVolume: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onVolumeChange: (v: number) => void;
  onAmbianceVolumeChange: (v: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AudioPlayer({
  playing,
  isPaused,
  timerSeconds,
  volume,
  ambianceVolume,
  onPause,
  onResume,
  onStop,
  onVolumeChange,
  onAmbianceVolumeChange,
}: Props) {
  if (!playing) return null;

  return (
    <div className={styles.card}>
      <span className={styles.label}>Segment {playing.segment_index + 1}</span>

      <div className={styles.controls}>
        <button
          className={styles.btn}
          onClick={isPaused ? onResume : onPause}
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? "▶" : "⏸"}
        </button>
        <button className={styles.btnStop} onClick={onStop} title="Stop">
          ■
        </button>
      </div>

      {timerSeconds !== null && (
        <span className={styles.timer}>{formatTime(timerSeconds)} remaining</span>
      )}

      <div className={styles.volumes}>
        <div className={styles.volumeRow}>
          <span className={styles.volumeLabel}>Voice</span>
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          />
        </div>
        <div className={styles.volumeRow}>
          <span className={styles.volumeLabel}>Ambiance</span>
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={ambianceVolume}
            onChange={(e) => onAmbianceVolumeChange(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
