import { UiText } from "@/core/i18n/provider";
import styles from "./reading-lock.module.css";

export function ReadingLock({ unlocked }: { unlocked: boolean }) {
  return (
    <span className={styles.lock} data-unlocked={unlocked}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path className={styles.shackle} d="M8 10V6a4 4 0 0 1 8 0v4" />
        <path d="M6 10h12v11H6V10ZM12 14v3" />
      </svg>
      <span className="sr-only" role="status">
        <UiText text={unlocked ? "已解锁" : "密码保护"} />
      </span>
    </span>
  );
}
