"use client";
import { UiText } from "@/core/i18n/provider";

import { useCallback, useState } from "react";
import { useShortcodeLibrary } from "@/core/shortcodes/use-library";
import type { CatalogItem } from "@/core/shortcodes/registry";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { DeliveryBadge } from "../settings/shared";
import { ShortcodePreview } from "./preview";
import { ShortcodeEditor } from "./editor";
import styles from "./shortcodes.module.css";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";

const origins = { frontend: "前端注册", backend: "后端注册", custom: "自定义" };
export function ShortcodeLibraryPage() {
  const library = useShortcodeLibrary();
  const editable = can(useAdminAccount(), "shortcodes:write");
  const definitions = library.applied;
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<CatalogItem | "new" | null>(null);
  const [dirty, setDirty] = useState(false),
    [pending, setPending] = useState<{
      value: CatalogItem | "new" | null;
    } | null>(null);
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);
  const choose = (value: CatalogItem | "new" | null) => {
    if (dirty) setPending({ value });
    else setSelected(value);
  };
  const items = library.items.filter(
    (item) =>
      (filter === "all" ||
        filter === item.origin ||
        (filter === "archived" && item.archived)) &&
      (filter === "archived" || !item.archived) &&
      `${item.source.name} ${item.source.title} ${item.source.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className={styles.page}>
      <AdminPageHeading
        title="短代码库"
        action={
          editable && (
            <Button
              className="admin-button admin-button-primary"
              onClick={() => choose("new")}
            >
              <Icon name="plus" />
              <UiText text="新建短代码" />
            </Button>
          )
        }
      />
      <div className={styles.toolbar}>
        <TextField
          type="search"
          aria-label="搜索短代码"
          placeholder="搜索名称或调用方式…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          programOptions
          name="shortcode-origin"
          label="短代码来源"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: "全部短代码" },
            { value: "custom", label: "自定义" },
            { value: "backend", label: "后端注册" },
            { value: "frontend", label: "前端注册" },
            { value: "archived", label: "已归档" },
          ]}
        />
        <Button
          className="admin-button"
          disabled={library.loading || dirty}
          onClick={() => void library.reload()}
        >
          <UiText text="重新读取" />
        </Button>
      </div>
      {library.error && (
        <p className={styles.error} role="alert">
          {library.error}
        </p>
      )}
      {library.loading && !library.items.length && (
        <p role="status" className={styles.hint}>
          <UiText text="正在读取短代码…" />
        </p>
      )}
      {selected && (
        <ShortcodeEditor
          key={selected === "new" ? "new" : selected.id}
          item={
            selected === "new"
              ? null
              : { ...selected, editable: selected.editable && editable }
          }
          onSaved={(item) => setSelected(item)}
          onReload={library.reload}
          onClose={() => choose(null)}
          onDirtyChange={onDirtyChange}
          definitions={definitions}
        />
      )}
      <div
        className={styles.grid}
        aria-label="短代码样式库"
        aria-busy={library.loading}
      >
        {items.map((item) => (
          <article className={styles.card} key={item.id}>
            <div className={styles.cardHeading}>
              <h2>{item.source.title}</h2>
              <span className={styles.badge}>
                {origins[item.origin]}
                {!item.editable ? <UiText text=" · 只读" /> : ""}
              </span>
            </div>
            <div className={styles.cardBody}>
              <code>{`{{< ${item.source.name} >}}`}</code>
              <ShortcodePreview
                compact
                definition={item.compiled}
                definitions={definitions}
                body={item.source.example_body}
              />
              <p>
                {item.source.description || (
                  <UiText text="自定义 HTML / CSS 模板" />
                )}
              </p>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.hint}>
                {item.archived ? (
                  <UiText text="已归档" />
                ) : item.applied_revision ? (
                  `已应用 ${item.applied_revision}${item.revision !== item.applied_revision ? " · 有草稿修改" : ""}`
                ) : (
                  <UiText text="尚未应用" />
                )}
              </span>
              <Button className="admin-button" onClick={() => choose(item)}>
                {item.editable && editable ? (
                  <UiText text="编辑模板" />
                ) : (
                  <UiText text="查看样式" />
                )}
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!library.loading && !items.length && !library.error && (
        <p className={styles.notice}>
          <UiText text="没有符合条件的短代码。" />
        </p>
      )}
      {library.settings && (
        <div className={styles.actions} aria-label="短代码前台同步状态">
          <span className={styles.hint}>
            <UiText text="前台同步" />
          </span>
          {library.settings.delivery.map((node) => (
            <span key={node.node_id} className={styles.actions}>
              <span className={styles.hint}>{node.node_id}</span>
              <DeliveryBadge value={node} />
            </span>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title="放弃未保存的修改？"
        description="当前模板的修改还没有保存。"
        confirmLabel="放弃修改"
        onCancel={() => setPending(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          setSelected(pending?.value ?? null);
          setPending(null);
          setDirty(false);
        }}
      />
    </div>
  );
}
