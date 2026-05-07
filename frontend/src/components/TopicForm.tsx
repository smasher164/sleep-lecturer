import { useState } from "react";
import styles from "./TopicForm.module.css";

const MAX_TIMER_MINUTES = 60;
const TIMER_OPTIONS = [15, 20, 30, 45, MAX_TIMER_MINUTES];

interface Props {
  onStart: (topic: string, timerMinutes: number) => void;
  disabled: boolean;
}

export function TopicForm({ onStart, disabled }: Props) {
  const [topic, setTopic] = useState("");
  const [timerMinutes, setTimerMinutes] = useState(30);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (topic.trim()) onStart(topic.trim(), timerMinutes);
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
              onClick={() => setTimerMinutes(min)}
              disabled={disabled}
            >
              {min < 60 ? `${min}m` : "1hr"}
            </button>
          ))}
        </div>
      </div>

      <button className={styles.button} type="submit" disabled={disabled || !topic.trim()}>
        Begin Lecture
      </button>
    </form>
  );
}
