import type { ModerationItem } from "@/core/contracts/operations";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { TextLink } from "../../components/ui/primitives";
import { commentTargets } from "./presentation";
import styles from "./style.module.css";

export function CommentTarget({ item }: { item: ModerationItem }) {
  const t = useT();
  const target = commentTargets[item.content_type];
  const title = item.content_title || t("无标题");
  const href = item.content_path
    ? `${item.content_path}#${item.status === "approved" ? `comment-${encodeURIComponent(item.id)}` : "comments"}`
    : null;
  return (
    <div className={styles.target}>
      <div className={styles.targetDetails}>
        <div className={styles.targetHeading}>
          <span className={styles.targetType}>
            <Icon name={target.icon} />
            <UiText text={target.label} />
          </span>
          <span className={styles.targetTitle}>
            {href ? (
              <TextLink href={href} target="_blank" rel="noopener noreferrer">
                {title}
              </TextLink>
            ) : (
              title
            )}
          </span>
        </div>
        <small className={styles.targetPath}>
          {item.content_path || t("原文未公开或已停用")}
        </small>
      </div>
      {href && (
        <TextLink
          className="admin-button admin-action-button"
          data-tone="accent"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t("查看原文")}：${title}`}
          title={t("在新窗口查看原文")}
        >
          <Icon name="external" />
          <UiText text="查看原文" />
        </TextLink>
      )}
    </div>
  );
}
