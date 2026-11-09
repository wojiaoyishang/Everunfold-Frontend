"use client";
import { useMemo, useState } from "react";
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
  type ModerateComments,
} from "@/core/contracts/operations";
import {
  Button,
  Form,
  TextField,
  TextArea,
  TextLink,
} from "../../components/ui/primitives";
import { Checkbox } from "../../components/ui/checkbox";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import styles from "./style.module.css";

const labels = {
  pending: "待审核",
  approved: "已通过",
  rejected: "未通过",
  spam: "垃圾评论",
  trash: "回收站",
  hidden: "已隐藏",
};
const actions = {
  approve: "通过审核",
  pending: "撤回审核",
  reject: "不通过",
  spam: "标为垃圾",
  trash: "移至回收站",
  restore: "恢复评论",
};
type Action = ModerateComments["action"];
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
    action: Action;
    items: ModerationItem[];
  } | null>(null);
  const [editor, setEditor] = useState<{
    item: ModerationItem;
    reply: boolean;
  } | null>(null);
  const [body, setBody] = useState("");
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
  const ask = (kind: Action, rows: ModerationItem[]) => {
    action.setMessage("");
    setCommand({ action: kind, items: rows });
  };
  return (
    <>
      <AdminPageHeading
        title="评论管理"
        description="审核通过后，评论才会在前台公开显示。"
        action={
          <Button className="admin-button" disabled={locked} onClick={refresh}>
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
            {Object.entries(labels).map(([key, label]) => (
              <Button
                key={key}
                aria-pressed={status === key}
                onClick={() => changeStatus(key as CommentQuery["status"])}
              >
                <UiText text={label} />
                <span>{state.data ? (state.data.counts[key] ?? 0) : "—"}</span>
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
              <Button
                key={kind}
                className="admin-button"
                disabled={locked || !selectedItems.length}
                onClick={() => ask(kind, selectedItems)}
              >
                <UiText text={actions[kind]} />
              </Button>
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
                  <span className="admin-badge">
                    <UiText text={labels[item.status]} />
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
                <div className={styles.target}>
                  <Icon name="book" />
                  {item.content_path ? (
                    <TextLink
                      href={item.content_path + "#comment-" + item.id}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.content_title || t("无标题")}
                    </TextLink>
                  ) : (
                    <span>{item.content_title || t("无标题")}</span>
                  )}
                </div>
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
                        <Button
                          className="admin-button"
                          key={kind}
                          disabled={locked}
                          onClick={() => ask(kind, [item])}
                        >
                          <UiText text={actions[kind]} />
                        </Button>
                      ))}
                    {item.status !== "trash" && (
                      <Button
                        className="admin-button"
                        disabled={locked}
                        onClick={() => {
                          setBody(item.body);
                          setEditor({ item, reply: false });
                          action.setMessage("");
                        }}
                      >
                        <Icon name="edit" />
                        <UiText text="编辑" />
                      </Button>
                    )}
                    {item.status === "approved" && (
                      <Button
                        className="admin-button"
                        disabled={locked}
                        onClick={() => {
                          setBody("");
                          setEditor({ item, reply: true });
                          action.setMessage("");
                        }}
                      >
                        <Icon name="comment" />
                        <UiText text="回复" />
                      </Button>
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
              disabled={locked || page === 1}
              onClick={() => {
                setPage(page - 1);
                setSelected([]);
              }}
            >
              <UiText text="上一页" />
            </Button>
            <span>
              {page} / {Math.max(1, Math.ceil((state.data?.total ?? 0) / 20))}
            </span>
            <Button
              className="admin-button"
              disabled={locked || page * 20 >= (state.data?.total ?? 0)}
              onClick={() => {
                setPage(page + 1);
                setSelected([]);
              }}
            >
              <UiText text="下一页" />
            </Button>
          </div>
        </footer>
      </section>
      <ConfirmDialog
        open={Boolean(command)}
        title={command ? actions[command.action] : "确认"}
        description={
          command?.action === "approve"
            ? "通过后将公开评论。"
            : "此操作会同步更新前台显示，回收站中的评论可以恢复。"
        }
        busy={action.busy}
        error={action.message}
        onCancel={() => setCommand(null)}
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
        confirmLabel="确认操作"
      >
        <p>
          {command?.items.length} <UiText text="条评论" />
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(editor)}
        title={editor?.reply ? "回复评论" : "编辑评论"}
        busy={action.busy}
        error={action.message}
        confirmLabel={editor?.reply ? "发布回复" : "保存修改"}
        confirmDisabled={!body.trim()}
        onCancel={() => setEditor(null)}
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
        <label className="admin-field">
          <span>
            <UiText text="评论正文" />
          </span>
          <TextArea
            rows={7}
            value={body}
            disabled={action.busy}
            maxLength={5000}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
      </ConfirmDialog>
    </>
  );
}
