"use client";
import { randomUUID } from "@/core/browser/crypto";
import { useState, type CSSProperties } from "react";
import type { MenuItem } from "@/generated/settings-contract";
import {
  flattenMenu,
  updateMenu,
  removeMenu,
  moveMenu,
  reparentMenu,
} from "@/core/settings/menu-tree";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Modal } from "../../components/ui/modal";
import { Icon } from "../../components/icon";
import { LibraryIcon } from "../../components/library-icon";
import { IconBrowser } from "../icons/icon-browser";
import { SettingsText } from "./shared";
export function MenuEditor({
  value,
  iconUrls = {},
  onChange,
  onIconUrl,
}: {
  value: MenuItem[];
  iconUrls?: Record<string, string>;
  onChange: (items: MenuItem[]) => void;
  onIconUrl: (id: string, url: string) => void;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState(false);
  const entries = flattenMenu(value);
  const selected =
    entries.find((entry) => entry.item.id === selection) ?? entries[0];
  const item = selected?.item;
  const descendants = item
    ? new Set(flattenMenu([item]).map((entry) => entry.item.id))
    : new Set<string>();
  const patch = (data: Partial<MenuItem>) => {
    if (item)
      onChange(
        updateMenu(value, item.id, (current) => ({ ...current, ...data })),
      );
  };
  const add = (parentId: string | null) => {
    if (entries.length >= 256) return;
    const next: MenuItem = {
      id: `menu-${randomUUID()}`,
      label: "新菜单",
      href: "/",
      icon: "link",
      children: [],
    };
    onChange(
      parentId
        ? updateMenu(value, parentId, (parent) => ({
            ...parent,
            children: [...(parent.children ?? []), next],
          }))
        : [...value, next],
    );
    setSelection(next.id);
    setCollapsed((old) => {
      const state = new Set(old);
      if (parentId) state.delete(parentId);
      return state;
    });
  };
  return (
    <div className="admin-menu-editor">
      <div className="admin-menu-toolbar">
        <span>{entries.length} 个菜单项</span>
        <Button
          className="admin-button"
          disabled={entries.length >= 256}
          onClick={() => add(null)}
        >
          <Icon name="plus" />
          添加顶级菜单
        </Button>
      </div>
      <div className="admin-menu-workbench">
        <div className="admin-menu-tree" aria-label="菜单结构">
          {entries
            .filter((entry) => !entry.ancestors.some((id) => collapsed.has(id)))
            .map((entry) => (
              <div
                key={entry.item.id}
                className="admin-menu-tree-row"
                data-selected={item?.id === entry.item.id}
                style={
                  { "--menu-depth": Math.min(entry.depth, 4) } as CSSProperties
                }
              >
                <Button
                  className="admin-menu-expander"
                  disabled={!entry.item.children?.length}
                  aria-label={`${collapsed.has(entry.item.id) ? "展开" : "收起"}${entry.item.label}分支`}
                  aria-expanded={
                    entry.item.children?.length
                      ? !collapsed.has(entry.item.id)
                      : undefined
                  }
                  onClick={() =>
                    setCollapsed((old) => {
                      const state = new Set(old);
                      if (state.has(entry.item.id)) state.delete(entry.item.id);
                      else state.add(entry.item.id);
                      return state;
                    })
                  }
                >
                  <Icon name="chevron" />
                </Button>
                <Button
                  className="admin-menu-node"
                  aria-pressed={item?.id === entry.item.id}
                  onClick={() => setSelection(entry.item.id)}
                >
                  <LibraryIcon
                    name={entry.item.icon}
                    url={iconUrls[entry.item.icon ?? ""]}
                  />
                  <span>{entry.item.label || "未命名"}</span>
                  {entry.depth > 3 && <small>{entry.depth + 1}级</small>}
                </Button>
              </div>
            ))}
          {!entries.length && (
            <p className="admin-library-empty">
              还没有菜单，添加一个开始编辑。
            </p>
          )}
        </div>
        {item && selected && (
          <div className="admin-menu-detail" key={item.id}>
            <div className="admin-menu-detail-heading">
              <strong>编辑菜单</strong>
              <span>第 {selected.depth + 1} 层</span>
            </div>
            <SettingsText
              label="菜单名称"
              value={item.label}
              maxLength={60}
              onChange={(label) => patch({ label })}
            />
            <SettingsText
              label="链接地址"
              value={item.href}
              placeholder="/archives 或 https://…"
              onChange={(href) => patch({ href })}
            />
            <div className="admin-settings-field">
              <span>所属菜单</span>
              <Select
                label="所属菜单"
                name="menu-parent"
                value={selected.parentId ?? "__root"}
                options={[
                  { value: "__root", label: "顶级菜单" },
                  ...entries
                    .filter((entry) => !descendants.has(entry.item.id))
                    .map((entry) => ({
                      value: entry.item.id,
                      label: `${entry.item.label} · 第 ${entry.depth + 1} 层`,
                    })),
                ]}
                onValueChange={(id) =>
                  onChange(
                    reparentMenu(value, item.id, id === "__root" ? null : id),
                  )
                }
              />
            </div>
            <div className="admin-settings-field">
              <span>图标</span>
              <Button
                className="admin-menu-icon-choice"
                onClick={() => setPicker(true)}
              >
                <LibraryIcon name={item.icon} url={iconUrls[item.icon ?? ""]} />
                <span>从图标库选择</span>
                <Icon name="chevron" />
              </Button>
            </div>
            <div className="admin-menu-detail-actions">
              <Button
                className="admin-button"
                disabled={entries.length >= 256}
                onClick={() => add(item.id)}
              >
                <Icon name="plus" />
                添加子菜单
              </Button>
              <span className="admin-menu-order">
                <Button
                  className="admin-icon-button"
                  aria-label="上移菜单"
                  disabled={selected.index === 0}
                  onClick={() => onChange(moveMenu(value, item.id, -1))}
                >
                  <Icon name="up" />
                </Button>
                <Button
                  className="admin-icon-button"
                  aria-label="下移菜单"
                  disabled={selected.index === selected.siblings - 1}
                  onClick={() => onChange(moveMenu(value, item.id, 1))}
                >
                  <Icon name="down" />
                </Button>
              </span>
              <Button
                className="admin-button admin-menu-delete"
                onClick={() => {
                  onChange(removeMenu(value, item.id));
                  setSelection(selected.parentId);
                }}
              >
                移除{item.children?.length ? "分支" : "菜单"}
              </Button>
            </div>
            <p className="admin-settings-hint">
              每一层都可继续添加子菜单。修改所属菜单时，整个分支会一起移动。保存前可撤销更改。
            </p>
          </div>
        )}
      </div>
      {picker && item && (
        <Modal title="选择图标" onClose={() => setPicker(false)}>
          <IconBrowser
            value={item.icon}
            onSelect={(icon) => {
              patch({ icon: icon.id });
              if (icon.url) onIconUrl(icon.id, icon.url);
              setPicker(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
