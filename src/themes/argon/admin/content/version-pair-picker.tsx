"use client";
import { UiText } from "@/core/i18n/provider";

import type {
  VersionDetail,
  VersionItem,
} from "@/core/contracts/collaboration";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import styles from "./versions.module.css";

const date = (value: string) => new Date(value).toLocaleString("zh-CN");
export function VersionPairPicker({
  versions,
  before,
  after,
  beforeDetail,
  afterDetail,
  disabled,
  onBefore,
  onAfter,
  onSwap,
}: {
  versions: VersionItem[];
  before: string;
  after: string;
  beforeDetail: VersionDetail | null;
  afterDetail: VersionDetail | null;
  disabled: boolean;
  onBefore: (value: string) => void;
  onAfter: (value: string) => void;
  onSwap: () => void;
}) {
  const items = new Map(versions.map((item) => [String(item.revision), item]));
  for (const detail of [beforeDetail, afterDetail])
    if (detail) items.set(String(detail.version.revision), detail.version);
  const options = [
    { value: "head", label: "最新版 · 实时草稿" },
    ...[...items.values()]
      .sort((a, b) => b.revision - a.revision)
      .map((item) => ({
        value: String(item.revision),
        label: `V${item.revision}${item.note ? ` · ${item.note}` : ""}`,
      })),
  ];
  for (const value of [before, after])
    if (value !== "head" && !items.has(value))
      options.push({ value, label: `V${value}` });
  const field = (
    side: "before" | "after",
    value: string,
    detail: VersionDetail | null,
    onChange: (value: string) => void,
  ) => (
    <div className={styles.pairField}>
      <span>
        {side === "before" ? (
          <UiText text="基础版本 · 左侧" />
        ) : (
          <UiText text="对比版本 · 右侧" />
        )}
      </span>
      <Select
        name={`revision-${side}`}
        label={side === "before" ? "基础版本" : "对比版本"}
        value={value}
        options={options}
        onValueChange={onChange}
        disabled={disabled}
      />
      <small>
        {value === "head" ? (
          <UiText text="跟随线上已保存的最新内容" />
        ) : detail ? (
          `${detail.version.actor} · ${date(detail.version.created_at)}`
        ) : (
          `V${value} · 版本快照`
        )}
      </small>
    </div>
  );
  return (
    <section className={styles.pairPicker} aria-label="选择对比版本">
      {field("before", before, beforeDetail, onBefore)}
      <Button
        className={`admin-button ${styles.swapVersions}`}
        aria-label="交换左右版本"
        disabled={disabled || before === after}
        onClick={onSwap}
      >
        <span aria-hidden="true">⇄</span>
        <span>
          <UiText text="交换" />
        </span>
      </Button>
      {field("after", after, afterDetail, onAfter)}
    </section>
  );
}
