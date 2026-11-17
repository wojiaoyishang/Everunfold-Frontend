import { LoadingProgress } from "../../components/extension-placeholder";
import styles from "./loading-state.module.css";

/** Shared template for initial admin data loads. Labels remain available to readers. */
export function AdminLoadingState({
  label = "正在读取设置…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={styles.loading}
      data-compact={compact || undefined}
      aria-busy="true"
    >
      <LoadingProgress label={label} />
    </div>
  );
}
