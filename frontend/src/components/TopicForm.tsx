import { useEffect, useState } from "react";
import { fetchProviders } from "../api";
import styles from "./TopicForm.module.css";

const MAX_TIMER_MINUTES = 60;
const TIMER_OPTIONS = [15, 20, 30, 45, MAX_TIMER_MINUTES];

interface Props {
  onStart: (topic: string, timerMinutes: number, provider: string) => void;
  disabled: boolean;
  timerMinutes: number;
  onTimerChange: (minutes: number) => void;
  provider: string;
  onProviderChange: (provider: string) => void;
}

export function TopicForm({ onStart, disabled, timerMinutes, onTimerChange, provider, onProviderChange }: Props) {
  const [topic, setTopic] = useState("");
  const [localModel, setLocalModel] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders().then((data) => {
      if (data.providers.includes("local")) {
        setLocalModel(data.local_model);
      }
    }).catch(() => {});
  }, []);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (topic.trim()) onStart(topic.trim(), timerMinutes, provider);
      }}
    >
      <input
        className={styles.input}
        type="text"
        placeholder="Enter a topic — e.g. Roman history"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        disabled={disabled}
      />

      <div className={styles.timerRow}>
        <span className={styles.timerLabel}>Sleep timer</span>
        <div className={styles.timerPills}>
          {TIMER_OPTIONS.map((min) => (
            <button
              key={min}
              type="button"
              className={timerMinutes === min ? styles.pillActive : styles.pill}
              onClick={() => onTimerChange(min)}
              disabled={disabled}
            >
              {min < 60 ? `${min}m` : "1hr"}
            </button>
          ))}
        </div>
      </div>

      {localModel && (
        <div className={styles.timerRow}>
          <span className={styles.timerLabel}>Model</span>
          <div className={styles.timerPills}>
            <button
              type="button"
              className={provider === "openai" ? styles.pillActive : styles.pill}
              onClick={() => onProviderChange("openai")}
              disabled={disabled}
            >
              OpenAI
            </button>
            <button
              type="button"
              className={provider === "local" ? styles.pillActive : styles.pill}
              onClick={() => onProviderChange("local")}
              disabled={disabled}
            >
              {localModel}
            </button>
          </div>
        </div>
      )}

      <button className={styles.button} type="submit" disabled={disabled || !topic.trim()}>
        Begin Lecture
      </button>
    </form>
  );
}
