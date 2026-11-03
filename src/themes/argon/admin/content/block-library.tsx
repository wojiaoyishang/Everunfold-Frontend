"use client";
import { useId, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "../../components/ui/primitives";
import { ActionPopover } from "../../components/ui/action-popover";
import { useDragItem } from "../../components/ui/drag-and-drop";
import { Icon } from "../../components/icon";
import { blockEditors } from "./plugins/registry";
import { useBlockComposer } from "./block-composer";
import styles from "./block-composer.module.css";

export function BlockLibrary({
  compact = false,
  onInsert,
  before,
}: {
  compact?: boolean;
  onInsert?: () => void;
  before?: string | null;
}) {
  const host = useBlockComposer();
  const insertionBefore = before === undefined ? host.anchor : before;
  const target =
    insertionBefore === null
      ? host.body.length
      : host.body.findIndex((b) => b.id === insertionBefore);
  return (
    <div className={styles.library}>
      <div className={styles.libraryHeading}>
        <strong>区块库</strong>
        <span>
          {target < 0
            ? "请重新选择位置"
            : `插入到${insertionBefore === null ? "末尾" : `第 ${target + 1} 块之前`}`}
        </span>
      </div>
      <div className={styles.cards}>
        {blockEditors.entries.map((plugin) => (
          <LibraryCard
            key={plugin.id}
            plugin={plugin}
            compact={compact}
            onInsert={onInsert}
            before={insertionBefore}
          />
        ))}
      </div>
      {!compact && (
        <p className={styles.libraryHelp}>拖到正文插入线，或点击添加。</p>
      )}
    </div>
  );
}
type LibraryCardProps = {
  plugin: (typeof blockEditors.entries)[number];
  compact: boolean;
  onInsert?: () => void;
  before: string | null;
};
function LibraryCard({ compact, ...props }: LibraryCardProps) {
  return compact ? (
    <LibraryChoice {...props} />
  ) : (
    <DraggableLibraryCard {...props} />
  );
}
function DraggableLibraryCard(props: Omit<LibraryCardProps, "compact">) {
  const host = useBlockComposer();
  const drag = useDragItem(
    { id: props.plugin.id, kind: "palette", label: props.plugin.label },
    host.disabled || host.body.length >= 128,
  );
  return <LibraryChoice {...props} drag={drag} />;
}
/** Popup choices never register duplicate draggable IDs or start a drag. */
function LibraryChoice({
  plugin,
  before,
  onInsert,
  drag,
}: Omit<LibraryCardProps, "compact"> & {
  drag?: ReturnType<typeof useDragItem>;
}) {
  const host = useBlockComposer();
  return (
    <Button
      {...drag?.handle}
      ref={(node) => {
        drag?.ref(node);
        if (typeof drag?.handle.ref === "function") drag.handle.ref(node);
      }}
      className={styles.libraryCard}
      disabled={host.disabled || host.body.length >= 128}
      aria-label={`添加 ${plugin.label} 区块`}
      data-dragging={drag?.dragging}
      onClick={() => {
        if (host.insert(plugin.format, before)) onInsert?.();
      }}
      onKeyDown={(event) => {
        if (event.code !== "Enter") drag?.handle.onKeyDown?.(event);
      }}
    >
      <span className={styles.cardIcon}>
        <Icon name={plugin.format === "html" ? "code" : "book"} />
      </span>
      <strong>{plugin.label}</strong>
      <small>{plugin.description}</small>
      <Icon name="plus" />
    </Button>
  );
}
export function ComposerSidebar({
  children,
  settingsOnly = false,
}: {
  children: ReactNode;
  settingsOnly?: boolean;
}) {
  const host = useBlockComposer(),
    id = useId();
  const narrow = useSyncExternalStore(
    subscribeViewport,
    () => matchMedia("(max-width: 800px)").matches,
    () => false,
  );
  const tabValue = settingsOnly && narrow ? "settings" : host.tab;
  return (
    <aside
      className={styles.inspector}
      data-composer-sidebar
      data-settings-only={settingsOnly}
      aria-label="区块与内容设置"
    >
      <div
        className={styles.inspectorTabs}
        role="tablist"
        aria-label="编辑侧栏"
      >
        {(["blocks", "settings"] as const).map((tab) => (
          <Button
            key={tab}
            role="tab"
            id={`${id}-${tab}-tab`}
            aria-selected={tabValue === tab}
            aria-controls={`${id}-${tab}`}
            tabIndex={tabValue === tab ? 0 : -1}
            onClick={() => host.setTab(tab)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const destination =
                  e.key === "Home"
                    ? "blocks"
                    : e.key === "End"
                      ? "settings"
                      : tab === "blocks"
                        ? "settings"
                        : "blocks";
                host.setTab(destination);
                const next =
                  e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
                    `button[id="${id}-${destination}-tab"]`,
                  );
                next?.focus();
              }
            }}
          >
            {tab === "blocks" ? (
              <>
                <Icon name="grid" />
                区块
              </>
            ) : (
              <>
                <Icon name="settings" />
                内容设置
              </>
            )}
          </Button>
        ))}
      </div>
      <div className={styles.inspectorViews}>
        <div
          className={styles.inspectorView}
          id={`${id}-blocks`}
          role="tabpanel"
          aria-labelledby={`${id}-blocks-tab`}
          data-active={tabValue === "blocks"}
          inert={tabValue !== "blocks"}
        >
          <BlockLibrary />
        </div>
        <div
          className={styles.inspectorView}
          id={`${id}-settings`}
          role="tabpanel"
          aria-labelledby={`${id}-settings-tab`}
          data-active={tabValue === "settings"}
          inert={tabValue !== "settings"}
        >
          {children}
        </div>
      </div>
    </aside>
  );
}
function subscribeViewport(changed: () => void) {
  const media = matchMedia("(max-width: 800px)");
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}
export function BlockLibraryPicker({
  before = null,
  label = "添加区块",
  className,
}: {
  before?: string | null;
  label?: string;
  className?: string;
}) {
  const host = useBlockComposer();
  return (
    <span className={className} onClickCapture={() => host.choose(before)}>
      <ActionPopover
        label={label}
        disabled={host.disabled || host.body.length >= 128}
        className={styles.openLibrary}
        panelClassName={styles.libraryPickerPanel}
        triggerContent={
          <>
            <Icon name="plus" />
            {label === "在此处插入区块" ? null : label}
          </>
        }
      >
        {(close) => <BlockLibrary compact before={before} onInsert={close} />}
      </ActionPopover>
    </span>
  );
}
