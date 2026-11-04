"use client";
import { useEffect, useRef } from "react";
import { Button, TextField } from "./primitives";
import { Icon } from "../icon";
import type { SourceSearch, SourceStatus } from "./code-editor";
import styles from "./source-search-panel.module.css";
export function SourceSearchPanel({
  id,
  label,
  open,
  disabled,
  query,
  status,
  onChange,
  onClose,
  onFind,
  onReplace,
}: {
  id: string;
  label: string;
  open: boolean;
  disabled: boolean;
  query: SourceSearch;
  status: SourceStatus;
  onChange: (query: SourceSearch) => void;
  onClose: () => void;
  onFind: (direction: -1 | 1) => void;
  onReplace: (all?: boolean) => void;
}) {
  const searchField = useRef<HTMLInputElement>(null);
  const replaceField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      searchField.current?.focus({ preventScroll: true });
      searchField.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  return (
    <div
      className={styles.searchReveal}
      data-open={open}
      aria-hidden={!open}
      inert={!open}
      data-editor-local-control
    >
      <div>
        <div
          id={id + "-search"}
          className={styles.searchPanel}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            } else if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement
            ) {
              event.preventDefault();
              if (event.target === replaceField.current) onReplace();
              else onFind(event.shiftKey ? -1 : 1);
            }
          }}
        >
          <div className={styles.searchRow}>
            <TextField
              ref={searchField}
              aria-label={label + " 查找文本"}
              placeholder="查找文本"
              value={query.search}
              onChange={(event) =>
                onChange({ ...query, search: event.target.value })
              }
            />
            <Button
              className={styles.tool}
              title="区分大小写"
              aria-label="区分大小写"
              aria-pressed={query.caseSensitive}
              onClick={() =>
                onChange({ ...query, caseSensitive: !query.caseSensitive })
              }
            >
              <span className={styles.case}>Aa</span>
            </Button>
            <Button
              className={styles.tool}
              title="上一个匹配"
              aria-label="上一个匹配"
              disabled={!status.matches}
              onClick={() => onFind(-1)}
            >
              <Icon name="up" />
            </Button>
            <Button
              className={styles.tool}
              title="下一个匹配"
              aria-label="下一个匹配"
              disabled={!status.matches}
              onClick={() => onFind(1)}
            >
              <Icon name="down" />
            </Button>
            <Button
              className={styles.tool}
              title="关闭查找"
              aria-label="关闭查找"
              onClick={onClose}
            >
              <Icon name="close" />
            </Button>
          </div>
          <div className={styles.searchRow}>
            <TextField
              ref={replaceField}
              aria-label={label + " 替换文本"}
              placeholder="替换为"
              value={query.replace}
              onChange={(event) =>
                onChange({ ...query, replace: event.target.value })
              }
            />
            <Button
              className={styles.searchAction}
              disabled={disabled || !status.matches}
              onClick={() => onReplace()}
            >
              替换
            </Button>
            <Button
              className={styles.searchAction}
              disabled={disabled || !status.matches}
              onClick={() => onReplace(true)}
            >
              全部替换
            </Button>
          </div>
          <span className={styles.matchCount} role="status">
            {query.search
              ? status.matches
                ? (status.currentMatch
                    ? "第 " + status.currentMatch + " 项 · "
                    : "") +
                  status.matches +
                  (status.limited ? "+" : "") +
                  " 个匹配"
                : "未找到匹配内容"
              : "在当前区块中查找 · Enter 下一项，Shift+Enter 上一项"}
          </span>
        </div>
      </div>
    </div>
  );
}
