"use client";
import { useState } from "react";
import type {
  ConflictResolution,
  MergeConflict,
} from "@/generated/collaboration-contract";
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
          {conflict.kind === "order"
            ? "区块顺序"
            : conflict.kind === "block"
              ? "区块删除或格式变化"
              : "内容同时修改"}
        </strong>
        <span>{resolved ? "已处理" : "待处理"}</span>
      </header>
      <p className={styles.path}>{conflict.path.join(" / ")}</p>
      <div className={styles.comparison}>
        <section>
          <strong>线上版本</strong>
          <pre>{printable(conflict.remote)}</pre>
          <Button
            className="admin-button"
            disabled={disabled}
            onClick={() => onResolve({ key: conflict.key, choice: "remote" })}
          >
            采用线上
          </Button>
        </section>
        <section>
          <strong>草稿分支</strong>
          <pre>{printable(conflict.local)}</pre>
          <Button
            className="admin-button"
            disabled={disabled}
            onClick={() => onResolve({ key: conflict.key, choice: "local" })}
          >
            采用草稿
          </Button>
        </section>
      </div>
      <div className={styles.actions}>
        <Button
          className="admin-button"
          aria-expanded={showBase}
          onClick={() => setShowBase(!showBase)}
        >
          共同基线
        </Button>
        <Button
          className="admin-button"
          aria-expanded={editing}
          onClick={() => setEditing(!editing)}
        >
          自行修改
        </Button>
      </div>
      {showBase && (
        <pre className={styles.base}>{printable(conflict.base)}</pre>
      )}
      {editing && (
        <div className={styles.manual}>
          <label className="admin-field">
            <span>
              手动合并内容
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
            保存这项决策
          </Button>
        </div>
      )}
    </section>
  );
}
