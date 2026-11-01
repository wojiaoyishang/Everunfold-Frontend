"use client";
import type { MenuItem, MenuLink } from "@/generated/settings-contract";
import { Icon } from "../../components/icon";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
const icons = [
  "home",
  "archive",
  "leaf",
  "book",
  "folder",
  "tag",
  "link",
  "star",
  "bell",
  "flask",
] as const;
const labels = [
  "首页",
  "归档",
  "叶片",
  "书本",
  "文件夹",
  "标签",
  "链接",
  "星星",
  "铃铛",
  "实验",
];
const iconOptions = icons.map((value, index) => ({
  value,
  label: labels[index],
}));
const newLink = (): MenuLink => ({
  id: `menu-${crypto.randomUUID()}`,
  label: "新链接",
  href: "/",
  icon: "link",
});
function move<T>(items: T[], index: number, step: number) {
  const next = [...items];
  [next[index], next[index + step]] = [next[index + step], next[index]];
  return next;
}
function MenuRow({
  item,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  item: MenuLink;
  index: number;
  total: number;
  onChange: (item: MenuLink) => void;
  onMove: (step: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="admin-menu-row">
      <div className="admin-menu-inputs">
        <TextField
          aria-label={`菜单 ${index + 1} 名称`}
          value={item.label}
          maxLength={60}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
        />
        <TextField
          aria-label={`${item.label} 链接`}
          value={item.href}
          placeholder="/archives 或 https://…"
          maxLength={2048}
          onChange={(e) => onChange({ ...item, href: e.target.value })}
        />
        <Select
          name={`icon-${item.id}`}
          label={`${item.label} 图标`}
          value={item.icon ?? "link"}
          options={iconOptions}
          onValueChange={(icon) =>
            onChange({ ...item, icon: icon as MenuLink["icon"] })
          }
        />
      </div>
      <div className="admin-menu-actions">
        <Button
          className="admin-icon-button"
          aria-label={`上移 ${item.label}`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <Icon name="up" />
        </Button>
        <Button
          className="admin-icon-button"
          aria-label={`下移 ${item.label}`}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          <Icon name="down" />
        </Button>
        <Button
          className="admin-icon-button"
          aria-label={`删除 ${item.label}`}
          onClick={onRemove}
        >
          <Icon name="close" />
        </Button>
      </div>
    </div>
  );
}
export function MenuEditor({
  value,
  onChange,
}: {
  value: MenuItem[];
  onChange: (items: MenuItem[]) => void;
}) {
  return (
    <div className="admin-menu-editor">
      {value.length === 0 && (
        <p className="admin-settings-hint">
          菜单为空时，顶栏与侧栏只保留站点品牌和工具入口。
        </p>
      )}
      {value.map((item, index) => (
        <div className="admin-menu-item" key={item.id}>
          <MenuRow
            item={item}
            index={index}
            total={value.length}
            onChange={(link) =>
              onChange(
                value.map((v, i) =>
                  i === index ? { ...link, children: item.children } : v,
                ),
              )
            }
            onMove={(step) => onChange(move(value, index, step))}
            onRemove={() => onChange(value.filter((_, i) => i !== index))}
          />
          <div className="admin-submenu">
            {(item.children ?? []).map((child, childIndex) => (
              <MenuRow
                key={child.id}
                item={child}
                index={childIndex}
                total={item.children!.length}
                onChange={(link) =>
                  onChange(
                    value.map((v, i) =>
                      i === index
                        ? {
                            ...v,
                            children: item.children!.map((c, j) =>
                              j === childIndex ? link : c,
                            ),
                          }
                        : v,
                    ),
                  )
                }
                onMove={(step) =>
                  onChange(
                    value.map((v, i) =>
                      i === index
                        ? {
                            ...v,
                            children: move(item.children!, childIndex, step),
                          }
                        : v,
                    ),
                  )
                }
                onRemove={() =>
                  onChange(
                    value.map((v, i) =>
                      i === index
                        ? {
                            ...v,
                            children: item.children!.filter(
                              (_, j) => j !== childIndex,
                            ),
                          }
                        : v,
                    ),
                  )
                }
              />
            ))}
            <Button
              className="admin-text-action"
              disabled={(item.children?.length ?? 0) >= 12}
              onClick={() =>
                onChange(
                  value.map((v, i) =>
                    i === index
                      ? { ...v, children: [...(v.children ?? []), newLink()] }
                      : v,
                  ),
                )
              }
            >
              <Icon name="plus" />
              添加子菜单
            </Button>
          </div>
        </div>
      ))}
      <Button
        className="admin-button"
        disabled={value.length >= 12}
        onClick={() => onChange([...value, { ...newLink(), children: [] }])}
      >
        <Icon name="plus" />
        添加导航项
      </Button>
    </div>
  );
}
