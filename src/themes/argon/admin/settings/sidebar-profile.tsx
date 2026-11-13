"use client";

import type {
  SidebarLink,
  SidebarProfilePreferences,
} from "@/core/contracts/settings";
import { randomUUID } from "@/core/browser/crypto";
import { UiText, useT } from "@/core/i18n/provider";
import { sidebarProfile, sidebarStats } from "../../sidebar-profile";
import { Button } from "../../components/ui/primitives";
import { SettingsText, SettingsToggle } from "./shared";

function SidebarLinkList({
  title,
  links,
  limit,
  onChange,
}: {
  title: string;
  links: SidebarLink[];
  limit: number;
  onChange: (links: SidebarLink[]) => void;
}) {
  const t = useT();
  const edit = (id: string, patch: Partial<SidebarLink>) =>
    onChange(
      links.map((link) => (link.id === id ? { ...link, ...patch } : link)),
    );
  const move = (index: number, offset: number) => {
    const next = [...links];
    const target = index + offset;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };
  return (
    <section aria-label={t(title)} className="admin-sidebar-links">
      <h3>
        <UiText text={title} />
      </h3>
      {links.map((link, index) => (
        <div key={link.id} className="admin-sidebar-link">
          <div className="admin-settings-two-col">
            <SettingsText
              label="链接名称"
              value={link.label}
              maxLength={60}
              onChange={(label) => edit(link.id, { label })}
            />
            <SettingsText
              label="链接地址"
              value={link.href}
              maxLength={2048}
              onChange={(href) => edit(link.id, { href })}
            />
          </div>
          <div className="admin-settings-actions">
            <Button
              className="admin-button"
              disabled={index === 0}
              aria-label={t("上移") + " " + (link.label || index + 1)}
              onClick={() => move(index, -1)}
            >
              <UiText text="上移" />
            </Button>
            <Button
              className="admin-button"
              disabled={index === links.length - 1}
              aria-label={t("下移") + " " + (link.label || index + 1)}
              onClick={() => move(index, 1)}
            >
              <UiText text="下移" />
            </Button>
            <Button
              className="admin-button"
              aria-label={t("移除链接") + " " + (link.label || index + 1)}
              onClick={() =>
                onChange(links.filter((item) => item.id !== link.id))
              }
            >
              <UiText text="移除链接" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        className="admin-button"
        disabled={links.length >= limit}
        onClick={() =>
          onChange([...links, { id: randomUUID(), label: "", href: "" }])
        }
      >
        <UiText text="添加链接" />
      </Button>
    </section>
  );
}

export function SidebarProfileSettings({
  author,
  value,
  onChange,
}: {
  author: string;
  value: SidebarProfilePreferences;
  onChange: (value: SidebarProfilePreferences) => void;
}) {
  const profile = sidebarProfile({ author }, value);
  const update = (patch: Partial<SidebarProfilePreferences>) =>
    onChange({ ...value, ...patch });
  const urls = ["文章统计链接", "分类统计链接", "标签统计链接"];
  return (
    <>
      <SettingsText
        label="博主显示名称"
        value={value.display_name ?? ""}
        placeholder={author}
        maxLength={100}
        onChange={(display_name) => update({ display_name })}
      />
      <SettingsToggle
        label="在博主卡片显示格言"
        value={profile.show_tagline}
        onChange={(show_tagline) => update({ show_tagline })}
      />
      <SettingsToggle
        label="显示文章、分类和标签统计"
        value={profile.show_stats}
        onChange={(show_stats) => update({ show_stats })}
      />
      {profile.show_stats && (
        <div className="admin-settings-two-col">
          {sidebarStats.map(({ url }, index) => (
            <SettingsText
              key={url}
              label={urls[index]!}
              value={profile[url]}
              hint="留空只显示数字和名称。"
              onChange={(value) => update({ [url]: value })}
            />
          ))}
        </div>
      )}
      <SidebarLinkList
        title="个人链接按钮"
        links={profile.personal_links}
        limit={12}
        onChange={(personal_links) => update({ personal_links })}
      />
      <SettingsText
        label="友情链接标题"
        value={profile.friends_title}
        maxLength={60}
        onChange={(friends_title) => update({ friends_title })}
      />
      <SidebarLinkList
        title="友情链接"
        links={profile.friend_links}
        limit={24}
        onChange={(friend_links) => update({ friend_links })}
      />
    </>
  );
}
