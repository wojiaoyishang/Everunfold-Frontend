"use client";
import { UiText, useT } from "@/core/i18n/provider";

import { randomUUID } from "@/core/browser/crypto";
import { useState, type CSSProperties } from "react";
import type { MenuItem, NavigationReference } from "@/core/contracts/settings";
import { useSettingsEditor } from "@/core/settings/editor";
import { normalizeCatalog } from "@/core/i18n/catalog";
import {
  flattenMenu,
  updateMenu,
  removeMenu,
  moveMenu,
  reparentMenu,
} from "@/core/settings/menu-tree";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Modal } from "../../components/ui/modal";
import { Icon } from "../../components/icon";
import { LibraryIcon } from "../../components/library-icon";
import { IconBrowser } from "../icons/icon-browser";
import { SettingsText } from "./shared";
import { NavigationPicker } from "./navigation-picker";
import { NavigationReferenceField } from "./navigation-reference";
import { LanguageLabel } from "../../components/language-label";
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
  const { draft } = useSettingsEditor();
  const languageCatalog = normalizeCatalog(draft?.site.language_catalog);
  const t = useT();
  const [selection, setSelection] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [newLabelLanguage, setNewLabelLanguage] = useState("");
  const [resourcePicker, setResourcePicker] = useState<
    NavigationReference["kind"] | null
  >(null);
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
  const patchLabel = (language: string, label: string) => {
    if (!item) return;
    const labels = { ...(item.labels ?? {}) };
    if (label.trim()) labels[language] = label;
    else delete labels[language];
    patch({ labels });
  };
  const enabledLanguages = languageCatalog.languages.filter(
    (language) => language.enabled !== false,
  );
  const configuredLanguages = Object.keys(item?.labels ?? {});
  const labelLanguages = [
    ...enabledLanguages.filter((language) =>
      configuredLanguages.includes(language.code),
    ),
    ...configuredLanguages
      .filter(
        (code) => !enabledLanguages.some((language) => language.code === code),
      )
      .sort()
      .map((code) => ({
        code,
        name: code,
        flag: "",
        prefix: "",
        enabled: true,
        ui_locale: "en" as const,
      })),
  ];
  const availableLabelLanguages = enabledLanguages.filter(
    (language) => !configuredLanguages.includes(language.code),
  );
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
        <span>
          {entries.length} <UiText text="个菜单项" />
        </span>
        <Button
          className="admin-button"
          disabled={entries.length >= 256}
          onClick={() => add(null)}
        >
          <Icon name="plus" />
          <UiText text="添加顶级菜单" />
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
                  <span>{entry.item.label || <UiText text="未命名" />}</span>
                  {entry.depth > 3 && (
                    <small>
                      {entry.depth + 1}
                      <UiText text="级" />
                    </small>
                  )}
                </Button>
              </div>
            ))}
          {!entries.length && (
            <p className="admin-library-empty">
              <UiText text="还没有菜单，添加一个开始编辑。" />
            </p>
          )}
        </div>
        {item && selected && (
          <div className="admin-menu-detail" key={item.id}>
            <div className="admin-menu-detail-heading">
              <strong>
                <UiText text="编辑菜单" />
              </strong>
              <span>
                <UiText text="第" />
                {selected.depth + 1} <UiText text="层" />
              </span>
            </div>
            <SettingsText
              label="菜单名称"
              hint="默认名称；语言专属名称为空时显示这里的文字。"
              value={item.label}
              maxLength={60}
              onChange={(label) => patch({ label })}
            />
            <div className="admin-settings-field">
              <span>
                <UiText text="链接类型" />
              </span>
              <Select
                name="menu-link-kind"
                label="链接类型"
                value={item.reference?.kind ?? "manual"}
                options={[
                  { value: "manual", label: "手动链接" },
                  { value: "article", label: "关联文章" },
                  { value: "shuoshuo", label: "关联说说" },
                  { value: "page", label: "关联页面" },
                ]}
                onValueChange={(value) => {
                  if (value === "manual") patch({ reference: null });
                  else setResourcePicker(value as NavigationReference["kind"]);
                }}
              />
            </div>
            {item.reference ? (
              <NavigationReferenceField
                key={`${item.reference.kind}:${item.reference.id}:${item.href}`}
                reference={item.reference}
                onChoose={() => setResourcePicker(item.reference!.kind)}
              />
            ) : (
              <SettingsText
                label="链接地址"
                value={item.href}
                placeholder="/archives 或 https://…"
                onChange={(href) => patch({ href })}
              />
            )}
            <div className="admin-settings-field">
              <span>
                <UiText text="所属菜单" />
              </span>
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
              <span>
                <UiText text="图标" />
              </span>
              <Button
                className="admin-menu-icon-choice"
                onClick={() => setPicker(true)}
              >
                <LibraryIcon name={item.icon} url={iconUrls[item.icon ?? ""]} />
                <span>
                  <UiText text="从图标库选择" />
                </span>
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
                <UiText text="添加子菜单" />
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
                className="admin-button"
                onClick={() => {
                  setNewLabelLanguage("");
                  setLabelsOpen(true);
                }}
              >
                <Icon name="languages" />
                <UiText text="多语言名称" />
              </Button>
              <Button
                className="admin-button admin-menu-delete"
                onClick={() => {
                  onChange(removeMenu(value, item.id));
                  setSelection(selected.parentId);
                }}
              >
                <UiText text="移除" />
                {item.children?.length ? (
                  <UiText text="分支" />
                ) : (
                  <UiText text="菜单" />
                )}
              </Button>
            </div>
            <p className="admin-settings-hint">
              <UiText text="每一层都可继续添加子菜单。修改所属菜单时，整个分支会一起移动。保存前可撤销更改。" />
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
      {resourcePicker && item && (
        <NavigationPicker
          kind={resourcePicker}
          onClose={() => setResourcePicker(null)}
          onPick={(resource) => {
            patch({
              reference: { kind: resource.kind, id: resource.id },
              href: resource.path,
              ...(item.label === "新菜单"
                ? { label: resource.title.slice(0, 60) || "未命名说说" }
                : {}),
            });
          }}
        />
      )}
      {labelsOpen && item && (
        <Modal title={t("多语言菜单名称")} onClose={() => setLabelsOpen(false)}>
          <div className="admin-menu-label-editor">
            <p className="admin-settings-hint">
              <UiText text="默认名称始终保留。只为需要不同显示文字的语言添加覆盖；未添加的语言自动回退默认名称。" />
            </p>
            <div className="admin-menu-label-default">
              <span>
                <UiText text="默认名称" />
              </span>
              <strong>{item.label}</strong>
            </div>
            {labelLanguages.length ? (
              <div className="admin-menu-language-list">
                {labelLanguages.map((language) => (
                  <div className="admin-menu-language-row" key={language.code}>
                    <LanguageLabel code={language.code} />
                    <TextField
                      aria-label={t("{language} 菜单名称", {
                        language: language.name,
                      })}
                      value={item.labels?.[language.code] ?? ""}
                      placeholder={item.label}
                      maxLength={60}
                      onChange={(event) =>
                        patchLabel(language.code, event.target.value)
                      }
                    />
                    <Button
                      type="button"
                      className="admin-icon-button"
                      aria-label={t("移除 {language} 菜单名称", {
                        language: language.name,
                      })}
                      onClick={() => {
                        const labels = { ...(item.labels ?? {}) };
                        delete labels[language.code];
                        patch({ labels });
                      }}
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-menu-language-empty">
                <UiText text="还没有语言专属名称。" />
              </p>
            )}
            {availableLabelLanguages.length > 0 && (
              <div className="admin-menu-language-add">
                <Select
                  programOptions
                  name="new-menu-label-language"
                  label="添加语言名称"
                  value={newLabelLanguage || availableLabelLanguages[0].code}
                  options={availableLabelLanguages.map((language) => ({
                    value: language.code,
                    label: language.name,
                    flag: language.flag,
                  }))}
                  onValueChange={setNewLabelLanguage}
                />
                <Button
                  type="button"
                  className="admin-button"
                  onClick={() => {
                    const code =
                      newLabelLanguage || availableLabelLanguages[0]?.code;
                    if (!code || !item) return;
                    patch({
                      labels: {
                        ...(item.labels ?? {}),
                        [code]: item.label,
                      },
                    });
                    setNewLabelLanguage("");
                  }}
                >
                  <Icon name="plus" />
                  <UiText text="添加语言名称" />
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
