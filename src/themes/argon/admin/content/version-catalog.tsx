"use client";
import type {
  DraftVersioning,
  VersionSelection,
} from "@/core/content-management/use-draft-versions";
import { Button } from "../../components/ui/primitives";
import styles from "./versions.module.css";

export type VersionTab = "version" | "branch" | "merge";
export type VersionDeletion = {
  label: string;
  action: () => Promise<boolean | null>;
};
export const mergeStates = {
  active: "合并中",
  cancelled: "已暂停",
  completed: "已完成",
  expired: "占用已到期",
  discarded: "已删除",
};
const date = (value: string) => new Date(value).toLocaleString("zh-CN");
const actionLabels = {
  create: "创建草稿",
  save: "保存版本",
  merge: "合并版本",
  autosave: "自动检查点",
  publish: "发布检查点",
  withdraw: "撤回检查点",
};

export function VersionCatalog({
  versioning,
  selection,
  tab,
  setTab,
  select,
  working,
  locked,
  onDelete,
  hideTabs = false,
}: {
  versioning: DraftVersioning;
  selection: VersionSelection | null;
  tab: VersionTab;
  setTab: (tab: VersionTab) => void;
  select: (value: VersionSelection) => void;
  working: boolean;
  locked: boolean;
  onDelete: (value: VersionDeletion) => void;
  hideTabs?: boolean;
}) {
  const { catalog, pages, setPages } = versioning;
  const selected = (kind: VersionSelection["kind"], id: string) =>
    selection?.kind === kind && selection.id === id;
  const choose = (kind: VersionSelection["kind"], id: string) =>
    select({ kind, id });
  const pager = (
    page: number,
    total: number,
    onChange: (value: number) => void,
  ) =>
    total > 20 && (
      <div className={styles.pager}>
        <Button
          className="admin-button"
          disabled={working || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          上一页
        </Button>
        <span>
          {page} / {Math.ceil(total / 20)}
        </span>
        <Button
          className="admin-button"
          disabled={working || page * 20 >= total}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    );
  return (
    <aside className={styles.catalog} aria-label="版本目录">
      {!hideTabs && (
        <div className={styles.tabs} role="group" aria-label="版本分类">
          {(
            [
              ["version", "历史版本"],
              ["branch", "草稿分支"],
              ["merge", "合并记录"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              aria-pressed={tab === key}
              disabled={working || locked}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
      {tab === "version" && (
        <section aria-label="历史版本列表">
          {catalog?.versions.map((item) => (
            <div
              key={item.revision}
              className={styles.catalogRow}
              data-selected={selected("version", String(item.revision))}
            >
              <Button
                className={styles.catalogSelect}
                aria-pressed={selected("version", String(item.revision))}
                disabled={working || locked}
                onClick={() => choose("version", String(item.revision))}
              >
                <strong>
                  V{item.revision}
                  {item.current && (
                    <span className={styles.badge}>最新检查点</span>
                  )}
                </strong>
                <span>
                  {item.note ||
                    actionLabels[item.action as keyof typeof actionLabels] ||
                    item.action}
                </span>
                <small>
                  {item.actor} · {date(item.created_at)}
                </small>
                {(item.parents.length > 0 || item.branch_id) && (
                  <small>
                    来源 {item.parents.map((p) => `V${p}`).join("、")}
                    {item.branch_id ? " + 草稿分支" : ""}
                  </small>
                )}
              </Button>
              <Button
                className={styles.deleteButton}
                aria-label={`删除历史草稿 V${item.revision}`}
                disabled={working || locked || item.current}
                onClick={() =>
                  onDelete({
                    label: `历史草稿 V${item.revision}`,
                    action: () => versioning.deleteVersion(item.revision),
                  })
                }
              >
                删除
              </Button>
            </div>
          ))}
          {!catalog && <p role="status">正在读取历史版本…</p>}
          {pager(pages.page, catalog?.total ?? 0, (page) =>
            setPages({ ...pages, page }),
          )}
        </section>
      )}
      {tab === "branch" && (
        <section aria-label="草稿分支列表">
          <h3>本机草稿</h3>
          {!versioning.local.length && (
            <p className={styles.empty}>此浏览器暂无独立草稿。</p>
          )}
          {versioning.local.map((item) => (
            <div
              key={item.id}
              className={styles.catalogRow}
              data-selected={selected("local", item.id)}
            >
              <Button
                className={styles.catalogSelect}
                aria-pressed={selected("local", item.id)}
                disabled={working || locked}
                onClick={() => choose("local", item.id)}
              >
                <strong>{item.payload.note || "本地草稿"}</strong>
                <span>{item.payload.fields.title || "未命名文章"}</span>
                <small>{date(new Date(item.updatedAt).toISOString())}</small>
                <small>
                  {item.submitted
                    ? "已送出副本，本机仍保留"
                    : "仅保存在此浏览器"}
                </small>
              </Button>
              <Button
                className={styles.deleteButton}
                aria-label="删除本机草稿"
                disabled={working || locked}
                onClick={() =>
                  onDelete({
                    label: "这份本机草稿",
                    action: () => versioning.deleteLocal(item.id),
                  })
                }
              >
                删除
              </Button>
            </div>
          ))}
          <h3>服务器草稿分支</h3>
          {!catalog?.branches.length && (
            <p className={styles.empty}>暂无已送到服务器的分支。</p>
          )}
          {catalog?.branches.map((item) => (
            <div
              key={item.id}
              className={styles.catalogRow}
              data-selected={selected("branch", item.id)}
            >
              <Button
                className={styles.catalogSelect}
                aria-pressed={selected("branch", item.id)}
                disabled={working || locked}
                onClick={() => choose("branch", item.id)}
              >
                <strong>{item.note || "草稿分支"}</strong>
                <small>
                  {item.actor} · {date(item.created_at)}
                </small>
                <small>
                  {item.merged_revision
                    ? `已合并到 V${item.merged_revision}`
                    : "待合并"}
                  {item.base_revision ? ` · 基于 V${item.base_revision}` : ""}
                </small>
              </Button>
              <Button
                className={styles.deleteButton}
                aria-label="删除服务器草稿分支"
                disabled={working || locked}
                onClick={() =>
                  onDelete({
                    label: "这份分支草稿",
                    action: () => versioning.deleteBranch(item.id),
                  })
                }
              >
                删除
              </Button>
            </div>
          ))}
          {pager(pages.branch_page, catalog?.branch_total ?? 0, (branch_page) =>
            setPages({ ...pages, branch_page }),
          )}
        </section>
      )}
      {tab === "merge" && (
        <section aria-label="合并记录列表">
          {!catalog?.merges.length && (
            <p className={styles.empty}>暂无合并记录。</p>
          )}
          {catalog?.merges.map((item) => (
            <div
              key={item.id}
              className={styles.catalogRow}
              data-selected={selected("merge", item.id)}
            >
              <Button
                className={styles.catalogSelect}
                aria-pressed={selected("merge", item.id)}
                disabled={
                  working || locked || item.owner_id !== versioning.accountId
                }
                onClick={() => choose("merge", item.id)}
              >
                <strong>
                  {mergeStates[item.status]}
                  {item.result_revision ? ` · V${item.result_revision}` : ""}
                </strong>
                <small>
                  {item.actor} · {date(item.created_at)}
                </small>
                <small>
                  {item.unresolved
                    ? `${item.unresolved} 项冲突待处理`
                    : "冲突已处理"}
                </small>
              </Button>
              <Button
                className={styles.deleteButton}
                aria-label="删除合并草稿记录"
                disabled={
                  working ||
                  locked ||
                  item.status === "active" ||
                  item.owner_id !== versioning.accountId
                }
                onClick={() =>
                  onDelete({
                    label: "这份合并草稿记录",
                    action: () => versioning.deleteMerge(item.id),
                  })
                }
              >
                删除
              </Button>
            </div>
          ))}
          {pager(pages.merge_page, catalog?.merge_total ?? 0, (merge_page) =>
            setPages({ ...pages, merge_page }),
          )}
        </section>
      )}
    </aside>
  );
}
