"use client";
import { randomUUID } from "@/core/browser/crypto";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DraftBlock } from "@/generated/content-admin-contract";
import type { BlockCommand } from "@/core/editor/block-commands";
import { DragAndDrop, type DragItem } from "../../components/ui/drag-and-drop";
import { Icon } from "../../components/icon";
import { blockEditors } from "./plugins/registry";
import styles from "./block-composer.module.css";

type Composer = {
  body: DraftBlock[];
  disabled: boolean;
  tab: "blocks" | "settings";
  setTab: (tab: "blocks" | "settings") => void;
  anchor: string | null;
  choose: (before: string | null) => void;
  insert: (
    format: DraftBlock["type"],
    before?: string | null,
    content?: string,
  ) => boolean;
  move: (id: string, before: string | null) => void;
  focus: React.RefObject<string | null>;
  moved: string | null;
  message: string;
};
const ComposerContext = createContext<Composer | null>(null);
export const useBlockComposer = () => {
  const value = useContext(ComposerContext);
  if (!value) throw new Error("区块宿主未装配");
  return value;
};
export function BlockComposer({
  body,
  disabled,
  command,
  onBusyChange,
  children,
}: {
  body: DraftBlock[];
  disabled: boolean;
  command: (command: BlockCommand) => boolean;
  onBusyChange: (busy: boolean) => void;
  children: ReactNode;
}) {
  const [tab, setTab] = useState<"blocks" | "settings">("blocks"),
    [anchor, setAnchor] = useState<string | null>(null),
    [moved, setMoved] = useState<string | null>(null),
    [message, setMessage] = useState("");
  const focus = useRef<string | null>(null);
  const finish = (commandValue: BlockCommand) => {
    if (disabled) return false;
    const changed = command(commandValue);
    if (!changed) {
      setMessage("插入位置已变化，请重新选择。");
      return false;
    }
    const id =
      commandValue.kind === "insert" ? commandValue.block.id : commandValue.id;
    setMoved(id);
    setMessage(
      commandValue.kind === "insert" ? "已添加区块" : "已调整区块顺序",
    );
    if (commandValue.kind === "insert") focus.current = id;
    return true;
  };
  const insert = (
    format: DraftBlock["type"],
    before = anchor,
    content = "",
  ) => {
    if (!blockEditors.get(format ?? "markdown")) return false;
    return finish({
      kind: "insert",
      block: { id: randomUUID(), type: format, content },
      before,
    });
  };
  const drop = (item: DragItem, before: string | null) => {
    if (item.kind === "block") finish({ kind: "move", id: item.id, before });
    else {
      const plugin = blockEditors.entries.find((p) => p.id === item.id);
      if (plugin) insert(plugin.format, before);
    }
  };
  return (
    <ComposerContext
      value={{
        body,
        disabled,
        tab,
        setTab,
        anchor,
        choose: (before) => {
          setAnchor(before);
          setTab("blocks");
        },
        insert,
        move: (id, before) => finish({ kind: "move", id, before }),
        focus,
        moved,
        message,
      }}
    >
      <DragAndDrop
        disabled={disabled}
        onBusyChange={onBusyChange}
        onDrop={drop}
        renderPreview={(item) => (
          <div className={styles.ghost}>
            <Icon name="grip" />
            <strong>{item.label}</strong>
            <span>放到插入线处</span>
          </div>
        )}
      >
        {children}
      </DragAndDrop>
      <span className="sr-only" role="status">
        {message}
      </span>
    </ComposerContext>
  );
}
