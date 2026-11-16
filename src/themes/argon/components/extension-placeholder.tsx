import { UiText } from "@/core/i18n/provider";
import styles from "./extension-placeholder.module.css";

export function ExtensionProgress() {
  return (
    <span className={styles.progress} aria-hidden="true">
      <span />
    </span>
  );
}

export function ExtensionPlaceholder({
  name,
  loading = false,
}: {
  name: string;
  loading?: boolean;
}) {
  return (
    <div
      className={styles.placeholder}
      role="status"
      data-loading={loading || undefined}
      data-anchor-pending={loading || undefined}
    >
      {loading ? (
        <>
          <span className="sr-only">
            <UiText text="正在加载组件…" />
          </span>
          <ExtensionProgress />
        </>
      ) : (
        <>
          <UiText text="组件暂不可用" />
          <code>{name}</code>
        </>
      )}
    </div>
  );
}
