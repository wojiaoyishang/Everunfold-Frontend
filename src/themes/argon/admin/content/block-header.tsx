"use client";
import type { ComponentProps, ReactNode, Ref } from "react";
import type { DraftBlock } from "@/generated/content-admin-contract";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { ActionPopover } from "../../components/ui/action-popover";
import { ConfirmPopover } from "../../components/ui/confirm-popover";
import { blockEditors } from "./plugins/registry";
import styles from "./block-composer.module.css";

export function BlockHeader({
  block,
  index,
  total,
  disabled,
  onMove,
  onFormat,
  onDelete,
  handle,
  controlsRef,
  formatDisabled,
}: {
  block: DraftBlock;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (position: "up" | "down" | "first" | "last") => void;
  onFormat: (format: "markdown" | "html") => void;
  onDelete: () => void;
  controlsRef: Ref<HTMLDivElement>;
  formatDisabled: boolean;
  handle?: ComponentProps<typeof Button>;
}) {
  const label = blockEditors.get(block.type ?? "markdown")?.label ?? block.type;
  return (
    <header className={styles.header}>
      <Button
        {...handle}
        className={styles.handle}
        disabled={disabled}
        aria-label={`拖动第 ${index + 1} 块排序`}
        title="拖动排序；空格拾起，方向键移动，Esc取消"
      >
        <Icon name="grip" />
      </Button>
      <span className={styles.format}>
        <Icon name={block.type === "html" ? "code" : "book"} />
        {label}
      </span>
      <span className={styles.number}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div ref={controlsRef} className={styles.modeControls} />
      <ActionPopover
        label={`第 ${index + 1} 块操作`}
        disabled={disabled}
        className={styles.more}
        panelClassName={styles.actions}
        triggerContent={<Icon name="more" />}
      >
        {(close) => (
          <>
            <MenuAction
              disabled={index === 0}
              onClick={() => {
                close();
                onMove("up");
              }}
              icon="up"
            >
              向上移动
            </MenuAction>
            <MenuAction
              disabled={index === total - 1}
              onClick={() => {
                close();
                onMove("down");
              }}
              icon="down"
            >
              向下移动
            </MenuAction>
            <MenuAction
              disabled={index === 0}
              onClick={() => {
                close();
                onMove("first");
              }}
              icon="up"
            >
              移到开头
            </MenuAction>
            <MenuAction
              disabled={index === total - 1}
              onClick={() => {
                close();
                onMove("last");
              }}
              icon="down"
            >
              移到末尾
            </MenuAction>
            <div className={styles.menuDivider} />
            {blockEditors.entries
              .filter((p) => p.format !== (block.type ?? "markdown"))
              .map((p) => (
                <MenuAction
                  key={p.id}
                  disabled={formatDisabled}
                  icon="code"
                  onClick={() => {
                    close();
                    onFormat(p.format);
                  }}
                >
                  切换为 {p.label}
                </MenuAction>
              ))}
            <div className={styles.menuDivider} />
            <ConfirmPopover
              label={`删除第 ${index + 1} 块`}
              title="删除这个正文块？"
              description="从草稿中移除，可以通过撤销恢复。"
              triggerClassName={styles.delete}
              disabled={disabled || total === 1}
              onConfirmed={() => {
                close();
                onDelete();
              }}
            >
              <Icon name="trash" />
              删除区块
            </ConfirmPopover>
          </>
        )}
      </ActionPopover>
    </header>
  );
}
function MenuAction({
  children,
  icon,
  ...props
}: ComponentProps<typeof Button> & {
  children: ReactNode;
  icon: ComponentProps<typeof Icon>["name"];
}) {
  return (
    <Button {...props}>
      <Icon name={icon} />
      {children}
    </Button>
  );
}
