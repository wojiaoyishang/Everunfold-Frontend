"use client";
import { useId, useMemo, useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { can } from "@/core/accounts/permissions";
import { useAccountAction } from "@/core/accounts/use-action";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { useModeration } from "@/core/operations/use-data";
import {
  moderateComments,
  editComment,
  replyToComment,
  type CommentQuery,
  type ModerationItem,
} from "@/core/contracts/operations";
import {
  Button,
  Form,
  TextField,
  TextArea,
} from "../../components/ui/primitives";
import { Checkbox } from "../../components/ui/checkbox";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { FormField } from "../../components/ui/form-field";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { AdminActionButton } from "../components/action-button";
import { CommentTarget } from "./comment-target";
import {
  commentActions,
  commentStatuses,
  commentTargets,
  type CommentAction,
} from "./presentation";
import styles from "./style.module.css";

export function CommentsPage() {
  const t = useT();
  const user = useAdminAccount();
  const { baseUrl, csrfToken } = useAdminRequest();
  const [status, setStatus] = useState<CommentQuery["status"]>("pending");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [command, setCommand] = useState<{
    action: CommentAction;
    items: ModerationItem[];
  } | null>(null);
  const [editor, setEditor] = useState<{
    item: ModerationItem;
    reply: boolean;
  } | null>(null);
  const [body, setBody] = useState("");
  const editorId = useId();
  const action = useAccountAction();
  const query = useMemo(
    () => ({ status, search, page, page_size: 20 }),
    [status, search, page],
  );
  const state = useModeration(query);
  const items = state.data?.items ?? [];
  const selectedItems = items.filter((item) => selected.includes(item.id));
  const writable = can(user, "comments:moderate");
  const locked = action.busy || state.loading || Boolean(state.error);
  const refresh = () => {
    setSelected([]);
    void state.refresh();
  };
  const changeStatus = (value: CommentQuery["status"]) => {
    setStatus(value);
    setPage(1);
    setSelected([]);
  };
  const ask = (kind: CommentAction, rows: ModerationItem[]) => {
    action.setMessage("");
    setCommand({ action: kind, items: rows });
  };
  const confirmation = command ? commentActions[command.action] : null;
  const confirmationTone = confirmation?.tone ?? "neutral";
  return (
    <>
      <AdminPageHeading
        title="评论管理"
        description="审核通过后，评论才会在前台公开显示。"
        action={
          <Button
            className="admin-button"
            disabled={action.busy || state.loading}
            onClick={refresh}
          >
            <Icon name="refresh" />
            <UiText text="刷新" />
          </Button>
        }
      />
      <section
        className={`admin-panel ${styles.panel}`}
        aria-busy={state.loading}
      >
        <div className={styles.filters}>
          <nav className={styles.tabs} aria-label={t("评论状态")}>
            <Button aria-pressed={!status} onClick={() => changeStatus(null)}>
              <UiText text="全部" />
            </Button>
            {Object.entries(commentStatuses).map(([key, { label }]) => (
              <Button
                key={key}
                aria-pressed={status === key}
                onClick={() => changeStatus(key as CommentQuery["status"])}
              >
                <UiText text={label} />
                <span className={styles.count}>
                  {state.data ? (state.data.counts[key] ?? 0) : "—"}
                </span>
              </Button>
            ))}
          </nav>
          <Form
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(text.trim());
              setPage(1);
              setSelected([]);
            }}
          >
            <TextField
              type="search"
              aria-label={t("搜索评论")}
              placeholder={t("评论、作者或原文标题")}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={200}
            />
            <Button type="submit" className="admin-button">
              <Icon name="search" />
              <UiText text="搜索" />
            </Button>
          </Form>
        </div>
        {state.error && (
          <p role="alert" className={styles.notice}>
            <UiText text={state.error} />
          </p>
        )}
        {action.message && !editor && !command && (
          <p role="status" className={styles.notice}>
            <UiText text={action.message} />
          </p>
        )}
        {writable && items.length > 0 && (
          <div className={styles.bulk}>
            <label>
              <Checkbox
                aria-label={t("选择本页评论")}
                checked={selectedItems.length === items.length}
                disabled={locked}
                onChange={(event) =>
                  setSelected(
                    event.target.checked ? items.map((item) => item.id) : [],
                  )
                }
              />
              <UiText text="选择本页" />
            </label>
            <span>
              {selectedItems.length} <UiText text="条已选择" />
            </span>
            {(status === "trash"
              ? (["restore"] as const)
              : (["approve", "spam", "trash"] as const)
            ).map((kind) => (
              <AdminActionButton
                key={kind}
                icon={commentActions[kind].icon}
                tone={commentActions[kind].tone}
                disabled={locked || !selectedItems.length}
                onClick={() => ask(kind, selectedItems)}
              >
                <UiText text={commentActions[kind].label} />
              </AdminActionButton>
            ))}
          </div>
        )}
        <div className={styles.list}>
          {items.map((item) => (
            <article key={item.id} className={styles.row}>
              {writable && (
                <Checkbox
                  aria-label={`${t("选择评论")} ${item.author}`}
                  checked={selected.includes(item.id)}
                  disabled={locked}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id),
                    )
                  }
                />
              )}
              <div className={styles.message}>
                <div className={styles.identity}>
                  <strong>{item.author}</strong>
                  <span
                    className="admin-badge admin-status-badge"
                    data-tone={commentStatuses[item.status].tone}
                  >
                    <Icon name={commentStatuses[item.status].icon} />
                    <UiText text={commentStatuses[item.status].label} />
                  </span>
                  <time dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </div>
                {item.reply_to && (
                  <small>
                    <UiText text="回复" /> {item.reply_to}
                  </small>
                )}
                <p className={styles.body}>{item.body}</p>
                <CommentTarget item={item} />
                {writable && (
                  <div className={styles.actions}>
                    {(item.status === "trash"
                      ? (["restore"] as const)
                      : item.status === "approved"
                        ? (["pending", "spam", "trash"] as const)
                        : (["approve", "reject", "spam", "trash"] as const)
                    )
                      .filter(
                        (kind) =>
                          !(item.status === "spam" && kind === "spam") &&
                          !(item.status === "rejected" && kind === "reject"),
                      )
                      .map((kind) => (
                        <AdminActionButton
                          icon={commentActions[kind].icon}
                          tone={commentActions[kind].tone}
                          key={kind}
                          disabled={locked}
                          onClick={() => ask(kind, [item])}
                        >
                          <UiText text={commentActions[kind].label} />
                        </AdminActionButton>
                      ))}
                    {item.status !== "trash" && (
                      <AdminActionButton
                        icon="edit"
                        tone="accent"
                        disabled={locked}
                        onClick={() => {
                          setBody(item.body);
                          setEditor({ item, reply: false });
                          action.setMessage("");
                        }}
                      >
                        <UiText text="编辑" />
                      </AdminActionButton>
                    )}
                    {item.status === "approved" && (
                      <AdminActionButton
                        icon="reply"
                        tone="accent"
                        disabled={locked}
                        onClick={() => {
                          setBody("");
                          setEditor({ item, reply: true });
                          action.setMessage("");
                        }}
                      >
                        <UiText text="回复" />
                      </AdminActionButton>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
          {!items.length && (
            <p className={styles.empty} role="status">
              <UiText
                text={state.loading ? "正在读取评论…" : "暂无符合条件的评论"}
              />
            </p>
          )}
        </div>
        <footer className={styles.pagination}>
          <span>
            {state.data?.total ?? "—"} <UiText text="条评论" />
          </span>
          <div>
            <Button
              className="admin-button"
              aria-label={t("上一页")}
              title={t("上一页")}
              disabled={locked || page === 1}
              onClick={() => {
                setPage(page - 1);
                setSelected([]);
              }}
            >
              <Icon name="arrow-left" />
              <span className={styles.paginationLabel}>
                <UiText text="上一页" />
              </span>
            </Button>
            <span className={styles.pageCount}>
              {page} / {Math.max(1, Math.ceil((state.data?.total ?? 0) / 20))}
            </span>
            <Button
              className="admin-button"
              aria-label={t("下一页")}
              title={t("下一页")}
              disabled={locked || page * 20 >= (state.data?.total ?? 0)}
              onClick={() => {
                setPage(page + 1);
                setSelected([]);
              }}
            >
              <span className={styles.paginationLabel}>
                <UiText text="下一页" />
              </span>
              <Icon name="arrow" />
            </Button>
          </div>
        </footer>
      </section>
      <ConfirmDialog
        open={Boolean(command)}
        title={confirmation?.label ?? "确认"}
        icon={confirmation?.icon}
        confirmIcon={confirmation?.icon}
        intent={confirmationTone === "neutral" ? "default" : confirmationTone}
        description={
          command?.action === "approve"
            ? "通过后将公开评论。"
            : "此操作会同步更新前台显示，回收站中的评论可以恢复。"
        }
        busy={action.busy}
        error={action.message}
        onCancel={() => {
          setCommand(null);
          action.setMessage("");
        }}
        onConfirmed={() => {
          setCommand(null);
          action.setMessage("评论已更新，正在同步前台。");
          refresh();
        }}
        onConfirm={() =>
          action.run(async (signal) => {
            if (!command) return;
            const payload = {
              action: command.action,
              items: command.items.map(({ id, revision }) => ({
                id,
                revision,
              })),
            };
            await moderateComments(
              baseUrl,
              { ...payload, operation_id: action.operation(payload) },
              csrfToken,
              { signal },
            );
          }, "")
        }
        confirmLabel={confirmation?.label ?? "确认操作"}
      >
        <p>
          {command?.items.length} <UiText text="条评论" />
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(editor)}
        title={editor?.reply ? "回复评论" : "编辑评论"}
        icon={editor?.reply ? "reply" : "edit"}
        description={
          editor?.reply
            ? "回复将以你的账号发布。"
            : "修改正文不会改变作者和审核状态。"
        }
        busy={action.busy}
        error={action.message}
        confirmLabel={editor?.reply ? "发布回复" : "保存修改"}
        confirmIcon={editor?.reply ? "send" : "save"}
        confirmDisabled={!body.trim()}
        onCancel={() => {
          setEditor(null);
          action.setMessage("");
        }}
        onConfirmed={() => {
          setEditor(null);
          action.setMessage("评论已更新，正在同步前台。");
          refresh();
        }}
        onConfirm={() =>
          action.run(async (signal) => {
            if (!editor) return;
            const payload = {
              id: editor.item.id,
              revision: editor.item.revision,
              body: body.trim(),
            };
            const fingerprint = { ...payload, reply: editor.reply };
            await (editor.reply ? replyToComment : editComment)(
              baseUrl,
              { ...payload, operation_id: action.operation(fingerprint) },
              csrfToken,
              { signal },
            );
          }, "")
        }
      >
        {editor && (
          <div className={styles.context}>
            <div className={styles.contextAuthor}>
              <Icon name="user" />
              <strong>{editor.item.author}</strong>
            </div>
            <span className={styles.contextTitle}>
              <UiText text={commentTargets[editor.item.content_type].label} />
              {" · "}
              {editor.item.content_title || t("无标题")}
            </span>
            {editor.reply && <blockquote>{editor.item.body}</blockquote>}
          </div>
        )}
        <FormField
          id={editorId}
          label={editor?.reply ? "回复正文" : "评论正文"}
        >
          <TextArea
            id={editorId}
            className={styles.editorBody}
            aria-describedby={`${editorId}-count`}
            placeholder={t(editor?.reply ? "写下你的回复…" : "输入评论正文…")}
            rows={7}
            value={body}
            disabled={action.busy}
            maxLength={5000}
            onChange={(event) => setBody(event.target.value)}
          />
        </FormField>
        <small id={`${editorId}-count`} className={styles.characterCount}>
          {body.length.toLocaleString()} / 5,000
        </small>
      </ConfirmDialog>
    </>
  );
}
