"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import type { EditorTerm } from "@/generated/content-admin-contract";
import { categoryTree } from "@/core/content-management/taxonomy-options";
import { Button, TextField } from "../../components/ui/primitives";
import { Checkbox } from "../../components/ui/checkbox";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
import styles from "./editor-workspace.module.css";

export type CreateCategory = (
  name: string,
  parentId: string | null,
) => Promise<EditorTerm | undefined>;
export function CategorySelector({
  terms,
  value,
  onChange,
  createCategory,
  disabled,
}: {
  terms: EditorTerm[];
  value: string[];
  onChange: (value: string[]) => void;
  createCategory: CreateCategory;
  disabled: boolean;
}) {
  const [tab, setTab] = useState("all");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tree = categoryTree(terms);
  const extra = value
    .filter((name) => !tree.some(({ term }) => term.name === name))
    .map((name) => ({
      term: { id: `draft:${name}`, name, kind: "category", count: 0 },
      depth: 0,
    }));
  const rows =
    tab === "all"
      ? [...tree, ...extra]
      : [...tree]
          .sort((a, b) => (b.term.count ?? 0) - (a.term.count ?? 0))
          .filter(({ term }) => (term.count ?? 0) > 0)
          .slice(0, 10)
          .map((row) => ({ ...row, depth: 0 }));
  const add = async () => {
    if (busy || disabled || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const term = await createCategory(name.trim(), parent || null);
      if (!term) throw new Error("missing category");
      if (!value.includes(term.name)) onChange([...value, term.name]);
      setName("");
      setTab("all");
      setAdding(false);
    } catch {
      setError("分类未添加，请检查名称、父分类或连接后重试。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.categorySelector}>
      <div className={styles.smallTabs} aria-label="分类列表范围">
        <Button aria-pressed={tab === "all"} onClick={() => setTab("all")}>
          <UiText text="所有分类" />
        </Button>
        <Button
          aria-pressed={tab === "popular"}
          onClick={() => setTab("popular")}
        >
          <UiText text="最多使用" />
        </Button>
      </div>
      <div className={styles.categoryList}>
        {rows.map(({ term, depth }) => (
          <label
            key={term.id}
            style={{ paddingInlineStart: `${10 + Math.min(depth, 10) * 16}px` }}
          >
            <Checkbox
              checked={value.includes(term.name)}
              disabled={disabled || busy}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, term.name]
                    : value.filter((name) => name !== term.name),
                )
              }
            />
            <span>{term.name}</span>
          </label>
        ))}
        {!rows.length && (
          <p>
            {tab === "all" ? (
              <UiText text="还没有分类，可以添加一个。" />
            ) : (
              <UiText text="发布内容后，常用分类会显示在这里。" />
            )}
          </p>
        )}
      </div>
      <Button
        className={styles.textButton}
        aria-expanded={adding}
        disabled={disabled || busy}
        onClick={() => setAdding(!adding)}
      >
        <Icon name="plus" /> <UiText text="添加分类" />
      </Button>
      <div className={styles.panelReveal} data-open={adding} inert={!adding}>
        <div>
          <div className={styles.categoryAdd}>
            <TextField
              aria-label="新分类名称"
              value={name}
              maxLength={60}
              placeholder="新分类名称"
              disabled={disabled || busy}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void add();
                }
              }}
            />
            <Select
              name="category-parent"
              label="父分类"
              value={parent}
              disabled={disabled || busy}
              options={[
                { value: "", label: "无父级分类" },
                ...tree.map(({ term, depth }) => ({
                  value: term.id,
                  label: `${"　".repeat(Math.min(depth, 10))}${term.name}`,
                })),
              ]}
              onValueChange={setParent}
            />
            {error && <small role="alert">{error}</small>}
            <Button
              className="admin-button"
              disabled={disabled || busy || !name.trim()}
              onClick={() => void add()}
            >
              <Icon
                name={busy ? "refresh" : "plus"}
                className={busy ? "admin-draft-spin" : ""}
              />
              {busy ? (
                <UiText text="正在添加…" />
              ) : (
                <UiText text="添加新分类" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
