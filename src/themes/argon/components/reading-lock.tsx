import { UiText } from "@/core/i18n/provider";
import { Icon } from "./icon";
import styles from "./reading-lock.module.css";

export function ReadingLock({
  unlocked,
  className,
}: {
  unlocked: boolean;
  className?: string;
}) {
  return (
    <span
      className={className ? `${styles.lock} ${className}` : styles.lock}
      data-unlocked={unlocked}
    >
      <Icon name="lock" className={styles.closed} />
      <Icon name="lock-open" className={styles.open} />
      <span className="sr-only" role="status">
        <UiText text={unlocked ? "已解锁" : "密码保护"} />
      </span>
    </span>
  );
}
