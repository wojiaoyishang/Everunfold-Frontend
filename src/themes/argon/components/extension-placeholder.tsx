import { UiText } from "@/core/i18n/provider";
import styles from "./extension-placeholder.module.css";

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
      data-anchor-pending={loading || undefined}
    >
      <UiText text={loading ? "正在加载组件…" : "组件暂不可用"} />{" "}
      {!loading && <code>{name}</code>}
    </div>
  );
}
