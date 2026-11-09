"use client";
import { useId, useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import type { useDraftCatalog } from "@/core/content-management/use-draft-catalog";
import { Select } from "../../components/ui/select";
import { Button } from "../../components/ui/primitives";
import { DateTimeField } from "../../components/ui/date-time-field";
import { Icon } from "../../components/icon";
import styles from "./management.module.css";

export function CatalogFilters({
  catalog,
}: {
  catalog: ReturnType<typeof useDraftCatalog>;
}) {
  const id = useId(),
    t = useT();
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const f = catalog.filters;
  const count = [
    f.author_id,
    f.category,
    f.tag,
    f.updated_from,
    f.updated_to,
  ].filter(Boolean).length;
  const open = expanded ?? count > 0;
  return (
    <div className={styles.filters}>
      <div className={styles.filterHeading}>
        <Button
          className="admin-button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setExpanded(!open)}
        >
          <Icon name="settings" />
          <UiText text="筛选条件" />
          {count > 0 && <span className={styles.count}>{count}</span>}
          <Icon name={open ? "up" : "down"} />
        </Button>
        <div className={styles.sort}>
          <Select
            name={`${id}-sort`}
            label="排序字段"
            programOptions
            value={f.order_by ?? "updated_at"}
            options={[
              { value: "updated_at", label: "最近修改" },
              { value: "created_at", label: "创建时间" },
              { value: "published_at", label: "发布时间" },
              { value: "title", label: "标题" },
            ]}
            onValueChange={(value) =>
              catalog.update({ order_by: value as typeof f.order_by })
            }
          />
          <Button
            className="admin-icon-button"
            title={f.direction === "asc" ? "升序" : "降序"}
            aria-label={t(f.direction === "asc" ? "升序" : "降序")}
            onClick={() =>
              catalog.update({
                direction: f.direction === "asc" ? "desc" : "asc",
              })
            }
          >
            <Icon name={f.direction === "asc" ? "up" : "down"} />
          </Button>
        </div>
      </div>
      <div className={styles.expand} data-open={open} id={id} inert={!open}>
        <div>
          <div className={styles.filterGrid}>
            <label>
              <UiText text="作者" />
              <Select
                name={`${id}-author`}
                label="作者筛选"
                value={f.author_id ?? ""}
                options={[
                  { value: "", label: t("全部作者") },
                  ...(catalog.result?.authors ?? []).map((author) => ({
                    value: author.id,
                    label: author.name,
                  })),
                ]}
                onValueChange={(value) =>
                  catalog.update({ author_id: value || null })
                }
              />
            </label>
            {(["category", "tag"] as const).map((kind) => (
              <label key={kind}>
                <UiText text={kind === "category" ? "分类" : "标签"} />
                <Select
                  name={`${id}-${kind}`}
                  label={kind === "category" ? "分类筛选" : "标签筛选"}
                  value={f[kind] ?? ""}
                  options={[
                    {
                      value: "",
                      label: t(kind === "category" ? "全部分类" : "全部标签"),
                    },
                    ...(catalog.terms?.terms ?? [])
                      .filter((term) => term.kind === kind)
                      .map((term) => ({ value: term.name, label: term.name })),
                  ]}
                  onValueChange={(value) =>
                    catalog.update({ [kind]: value || null })
                  }
                />
              </label>
            ))}
            <label>
              <UiText text="修改时间起" />
              <DateTimeField
                label="修改时间起"
                value={f.updated_from}
                onValueChange={(value) =>
                  catalog.update({ updated_from: value })
                }
              />
            </label>
            <label>
              <UiText text="修改时间止" />
              <DateTimeField
                label="修改时间止"
                value={f.updated_to}
                onValueChange={(value) => catalog.update({ updated_to: value })}
              />
            </label>
            <Button className="admin-button" onClick={catalog.clearFilters}>
              <Icon name="undo" />
              <UiText text="重置筛选" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
