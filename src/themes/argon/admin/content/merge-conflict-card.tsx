"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import type {
  ConflictResolution,
  MergeConflict,
} from "@/core/contracts/collaboration";
import { Button, TextArea } from "../../components/ui/primitives";
import styles from "./versions.module.css";
const printable = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

export function MergeConflictCard({
  conflict,
  resolved,
  disabled,
  onResolve,
}: {
  conflict: MergeConflict;
  resolved: boolean;
  disabled: boolean;
  onResolve: (resolution: ConflictResolution) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showBase, setShowBase] = useState(false);
  const [value, setValue] = useState(printable(conflict.local));
  const [error, setError] = useState("");
  return (
    <section className={styles.conflict} data-resolved={resolved}>
      <header>
        <strong>
          {conflict.kind === "order" ? (
            <UiText text="区块顺序" />
          ) : conflict.kind === "block" ? (
            <UiText text="区块删除或格式变化" />
          ) : (
            <UiText text="内容同时修改" />
          )}
        </strong>
        <span>
          {resolved ? <UiText text="已处理" /> : <UiText text="待处理" />}
        </span>
      </header>
      <p className={styles.path}>{conflict.path.join(" / ")}</p>
      <div className={styles.comparison}>
        <section>
          <strong>
            <UiText text="线上版本" />
          </strong>
          <pre>{printable(conflict.remote)}</pre>
          <Button
            className="admin-button"
            disabled={disabled}
            onClick={() => onResolve({ key: conflict.key, choice: "remote" })}
          >
            <UiText text="采用线上" />
          </Button>
        </section>
        <section>
          <strong>
            <UiText text="草稿分支" />
          </strong>
          <pre>{printable(conflict.local)}</pre>
          <Button
            className="admin-button"
            disabled={disabled}
            onClick={() => onResolve({ key: conflict.key, choice: "local" })}
          >
            <UiText text="采用草稿" />
          </Button>
        </section>
      </div>
      <div className={styles.actions}>
        <Button
          className="admin-button"
          aria-expanded={showBase}
          onClick={() => setShowBase(!showBase)}
        >
          <UiText text="共同基线" />
        </Button>
        <Button
          className="admin-button"
          aria-expanded={editing}
          onClick={() => setEditing(!editing)}
        >
          <UiText text="自行修改" />
        </Button>
      </div>
      {showBase && (
        <pre className={styles.base}>{printable(conflict.base)}</pre>
      )}
      {editing && (
        <div className={styles.manual}>
          <label className="admin-field">
            <span>
              <UiText text="手动合并内容" />
              {typeof conflict.local === "string" ||
              typeof conflict.remote === "string"
                ? ""
                : "（JSON）"}
            </span>
            <TextArea
              value={value}
              rows={6}
              maxLength={400000}
              disabled={disabled}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <Button
            className="admin-button"
            disabled={disabled}
            onClick={() => {
              try {
                const custom =
                  typeof conflict.local === "string" ||
                  typeof conflict.remote === "string"
                    ? value
                    : JSON.parse(value);
                setError("");
                onResolve({
                  key: conflict.key,
                  choice: "custom",
                  value: custom,
                });
              } catch {
                setError("请填写有效的 JSON。");
              }
            }}
          >
            <UiText text="保存这项决策" />
          </Button>
        </div>
      )}
    </section>
  );
}
