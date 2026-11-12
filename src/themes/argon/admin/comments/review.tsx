"use client";

import { useMemo } from "react";
import { can } from "@/core/accounts/permissions";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { moderateComments } from "@/core/contracts/operations";
import { RequestError } from "@/core/http/request";
import { UiText } from "@/core/i18n/provider";
import { useModeration } from "@/core/operations/use-data";
import { Button, TextLink } from "../../components/ui/primitives";
import { AdminPageHeading } from "../components/page-heading";
import { AdminActionButton } from "../components/action-button";
import { CommentTarget } from "./comment-target";
import { commentActions, commentStatuses } from "./presentation";
import styles from "./style.module.css";

type ReviewIntent = "approve" | "reject";

export function CommentReviewPage({
  id,
  intent,
}: {
  id: string | null;
  intent?: ReviewIntent;
}) {
  const user = useAdminAccount();
  return (
    <>
      <AdminPageHeading
        title="确认评论审核"
        action={
          <TextLink className="admin-button" href="/admin/comments">
            <UiText text="返回评论管理" />
          </TextLink>
        }
      />
      {!id || !can(user, "comments:read") ? (
        <p className={styles.notice} role="alert">
          <UiText text={id ? "没有读取此评论的权限。" : "评论审核链接无效。"} />
        </p>
      ) : (
        <ReviewComment id={id} intent={intent} />
      )}
    </>
  );
}

function ReviewComment({ id, intent }: { id: string; intent?: ReviewIntent }) {
  const user = useAdminAccount();
  const { baseUrl, csrfToken } = useAdminRequest();
  const query = useMemo(() => ({ comment_id: id, page_size: 1 }), [id]);
  const review = useModeration(query);
  const item = review.data?.items[0];
  const writable = can(user, "comments:moderate");
  const operation = useAccountAction((error) =>
    error instanceof RequestError && error.status === 409
      ? "评论已被修改或处理，已重新读取。"
      : accountFailure(error),
  );
  const confirm = async (action: ReviewIntent) => {
    if (!writable || !item || item.status !== "pending" || review.loading)
      return;
    let needsRefresh = false;
    const saved = await operation.run(async (signal) => {
      const payload = {
        action,
        items: [{ id: item.id, revision: item.revision }],
        pending_only: true,
      };
      try {
        await moderateComments(
          baseUrl,
          { ...payload, operation_id: operation.operation(payload) },
          csrfToken,
          { signal },
        );
      } catch (error) {
        needsRefresh =
          error instanceof RequestError &&
          (error.status === 404 || error.status === 409);
        throw error;
      }
    }, "评论审核结果已保存。");
    if (saved || needsRefresh) await review.refresh();
  };

  return (
    <section
      className={`admin-panel ${styles.reviewPanel}`}
      aria-busy={review.loading || operation.busy}
    >
      {review.error ? (
        <div className={styles.reviewActions}>
          <span role="alert">
            <UiText text={review.error} />
          </span>
          <Button
            className="admin-button"
            onClick={() => void review.refresh()}
          >
            <UiText text="重试" />
          </Button>
        </div>
      ) : item ? (
        <>
          <div className={styles.identity}>
            <strong>{item.author}</strong>
            <span className={styles.count}>
              <UiText text={commentStatuses[item.status].label} />
            </span>
          </div>
          <p className={styles.body}>{item.body}</p>
          <CommentTarget item={item} />
          {item.status !== "pending" ? (
            <p role="status">
              <UiText text="这条评论已处理，当前状态如上。" />
            </p>
          ) : writable ? (
            <>
              {intent && (
                <p>
                  <UiText
                    text={
                      intent === "approve"
                        ? "通过后将公开评论。"
                        : "拒绝后，这条评论不会在前台显示。"
                    }
                  />
                </p>
              )}
              <div className={styles.reviewActions}>
                {(intent ? [intent] : (["approve", "reject"] as const)).map(
                  (action) => (
                    <AdminActionButton
                      key={action}
                      icon={commentActions[action].icon}
                      tone={commentActions[action].tone}
                      disabled={operation.busy || review.loading}
                      onClick={() => void confirm(action)}
                    >
                      <UiText
                        text={action === "approve" ? "确认通过" : "确认拒绝"}
                      />
                    </AdminActionButton>
                  ),
                )}
              </div>
            </>
          ) : (
            <p role="status">
              <UiText text="当前账号没有审核评论的权限。" />
            </p>
          )}
        </>
      ) : (
        <p role="status">
          <UiText
            text={review.loading ? "正在读取评论…" : "未找到这条评论。"}
          />
        </p>
      )}
      {operation.message && (
        <p role="status">
          <UiText text={operation.message} />
        </p>
      )}
    </section>
  );
}
