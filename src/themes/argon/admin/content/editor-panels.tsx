"use client";
import { UiText } from "@/core/i18n/provider";

import { useId, useState, type ComponentType, type ReactNode } from "react";
import type {
  ContentTypeDefinition,
  DraftFields,
  DraftDetail,
  EditorSettings,
  EditorTerm,
  MediaURL,
} from "@/core/contracts/content-admin";
import type { MediaItem } from "@/core/contracts/settings";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import { DateTimeField } from "../../components/ui/date-time-field";
import { Select } from "../../components/ui/select";
import { PasswordField } from "../../components/ui/password-field";
import { Switch } from "../../components/ui/switch";
import { CaptchaOverrides } from "../components/captcha-overrides";
import { CategorySelector, type CreateCategory } from "./category-selector";
import { TagSelector } from "./tag-selector";
import { Icon } from "../../components/icon";
import { MediaPreview } from "../media/media-preview";
import { EditorMediaDialog } from "./editor-media-dialog";
import styles from "./editor-workspace.module.css";
import {
  PublicationSchedule,
  type PublicationScheduleProps,
} from "./publication-schedule";

function Panel({
  title,
  children,
  initialOpen = true,
}: {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(initialOpen);
  return (
    <section className={styles.panel}>
      <Button
        className={styles.panelHeading}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <UiText text={title} />
        <Icon name="chevron" />
      </Button>
      <div
        id={id}
        className={styles.panelReveal}
        data-open={open}
        inert={!open}
      >
        <div>
          <div className={styles.panelBody}>{children}</div>
        </div>
      </div>
    </section>
  );
}
interface PanelProps {
  type: ContentTypeDefinition;
  fields: DraftFields;
  detail: DraftDetail | null;
  settings: EditorSettings;
  update: (patch: Partial<EditorSettings>) => void;
  disabled: boolean;
  terms: EditorTerm[];
  media: Record<string, MediaURL>;
  onMedia: (item: MediaItem) => void;
  createCategory: CreateCategory;
  updateFields: (patch: Partial<DraftFields>) => void;
  publication: PublicationScheduleProps;
}
function PublicationPanel({
  settings,
  update,
  detail,
  disabled,
  publication,
}: PanelProps) {
  return (
    <Panel title="发布设置">
      <dl className={styles.publicationInfo}>
        <div>
          <dt>
            <UiText text="状态" />
          </dt>
          <dd>
            {detail?.published_revision ? (
              <UiText text="已发布 · 可继续编辑草稿" />
            ) : (
              <UiText text="草稿" />
            )}
          </dd>
        </div>
        <div>
          <dt>
            <UiText text="作者" />
          </dt>
          <dd>{detail?.author || <UiText text="当前登录用户" />}</dd>
        </div>
      </dl>
      <PublicationSchedule detail={detail} {...publication} />
      <div className="admin-field">
        <span>
          <UiText text="显示时间" />
        </span>
        <DateTimeField
          label="显示时间"
          value={settings.display_published_at}
          disabled={disabled}
          onValueChange={(display_published_at) =>
            update({ display_published_at })
          }
        />
        <small>
          <UiText text="留空保留原时间；新内容使用发布时间。" />
        </small>
      </div>
      <div className={styles.switchRow}>
        <span>
          <UiText text="首页置顶" />
        </span>
        <Switch
          aria-label="首页置顶"
          checked={settings.pinned ?? false}
          disabled={disabled}
          onCheckedChange={(pinned) => update({ pinned })}
        />
      </div>
    </Panel>
  );
}
function AccessPanel({
  settings,
  detail,
  disabled,
  fields,
  updateFields,
}: PanelProps) {
  const protectedContent = settings.visibility === "password";
  return (
    <Panel title="访问权限">
      <Select
        programOptions
        name="content-visibility"
        label="文章可见性"
        disabled={disabled}
        value={settings.visibility ?? "public"}
        options={[
          { value: "public", label: "公开" },
          { value: "password", label: "密码保护" },
        ]}
        onValueChange={(value) =>
          updateFields({
            settings: {
              ...settings,
              visibility: value as "public" | "password",
              opens_at: value === "public" ? null : settings.opens_at,
            },
            access_password: null,
          })
        }
      />
      <div
        className={styles.panelReveal}
        data-open={protectedContent}
        inert={!protectedContent}
      >
        <div>
          <div className={styles.accessFields}>
            <label className="admin-field">
              <span>
                <UiText text="文章密码" />
              </span>
              <PasswordField
                aria-label="文章密码"
                autoComplete="new-password"
                disabled={disabled || !protectedContent}
                value={fields.access_password ?? ""}
                maxLength={200}
                placeholder={
                  detail?.has_password
                    ? "已设置；留空保持原密码"
                    : "设置访问密码"
                }
                onChange={(event) =>
                  updateFields({ access_password: event.target.value || null })
                }
              />
            </label>
            <small>
              <UiText text="读者输入密码后才能阅读正文。文中的媒体文件仍使用公开链接。" />
            </small>
          </div>
        </div>
      </div>
    </Panel>
  );
}
function OpeningPanel({ settings, update, disabled }: PanelProps) {
  const enabled = settings.visibility === "password";
  return (
    <Panel title="定时开放" initialOpen={Boolean(settings.opens_at)}>
      <div className="admin-field">
        <span>
          <UiText text="自动开放时间" />
        </span>
        <DateTimeField
          label="自动开放时间"
          value={settings.opens_at}
          disabled={disabled || !enabled}
          onValueChange={(opens_at) => update({ opens_at })}
        />
      </div>
      <small>
        {enabled ? (
          <UiText text="开放前可凭文章密码提前访问，到点后自动公开。按当前设备时区填写；留空则一直需要密码。" />
        ) : (
          <UiText text="先将文章可见性设为密码保护，再设置开放时间。" />
        )}
      </small>
    </Panel>
  );
}
function CoverPanel({
  settings,
  update,
  disabled,
  media,
  onMedia,
}: PanelProps) {
  const [picker, setPicker] = useState(false);
  const url = settings.cover_media_id
    ? media[settings.cover_media_id]?.original
    : null;
  return (
    <Panel title="封面图片">
      <Button
        className={styles.cover}
        disabled={disabled}
        onClick={() => setPicker(true)}
        aria-label={url ? "更换封面图片" : "选择封面图片"}
      >
        {url ? (
          <MediaPreview url={url} kind="image" label="当前封面" />
        ) : (
          <>
            <Icon name="image" />
            <span>
              {settings.cover_media_id ? (
                <UiText text="封面暂不可预览 · 重新选择" />
              ) : (
                <UiText text="从媒体库选择" />
              )}
            </span>
          </>
        )}
      </Button>
      {settings.cover_media_id && (
        <Button
          className={styles.textButton}
          disabled={disabled}
          onClick={() => update({ cover_media_id: null })}
        >
          <Icon name="trash" /> <UiText text="移除封面" />
        </Button>
      )}
      {picker && (
        <EditorMediaDialog
          kind="image"
          onClose={() => setPicker(false)}
          onPick={(item) => {
            if (disabled) return;
            onMedia(item);
            update({ cover_media_id: item.id.replace(/^media:/, "") });
          }}
        />
      )}
    </Panel>
  );
}
function CategoryPanel({
  settings,
  update,
  terms,
  disabled,
  createCategory,
}: PanelProps) {
  return (
    <Panel title="分类目录">
      <CategorySelector
        terms={terms}
        value={settings.categories ?? []}
        onChange={(categories) => update({ categories })}
        disabled={disabled}
        createCategory={createCategory}
      />
    </Panel>
  );
}
function TagsPanel({ settings, update, terms, disabled }: PanelProps) {
  return (
    <Panel title="标签">
      <TagSelector
        terms={terms}
        value={settings.tags ?? []}
        onChange={(tags) => update({ tags })}
        disabled={disabled}
      />
    </Panel>
  );
}
function DiscussionPanel({ settings, update, disabled }: PanelProps) {
  return (
    <Panel title="讨论" initialOpen={false}>
      <div className={styles.switchRow}>
        <span>
          <UiText text="允许评论" />
        </span>
        <Switch
          aria-label="允许评论"
          checked={settings.comments_open ?? true}
          disabled={disabled}
          onCheckedChange={(comments_open) => update({ comments_open })}
        />
      </div>
      <small>
        <UiText text="关闭后保留已有留言，隐藏回复与写留言入口。" />
      </small>
    </Panel>
  );
}
function CaptchaPanel({ settings, update, disabled }: PanelProps) {
  return (
    <Panel title="验证码" initialOpen={false}>
      <CaptchaOverrides
        value={settings}
        onChange={update}
        disabled={disabled}
      />
    </Panel>
  );
}
function SeoPanel({ settings, update, fields, disabled }: PanelProps) {
  return (
    <Panel title="搜索展示" initialOpen={false}>
      <label className="admin-settings-toggle">
        <span>
          <UiText text="允许搜索引擎收录" />
        </span>
        <Switch
          checked={settings.allow_indexing !== false}
          disabled={disabled}
          onCheckedChange={(allow_indexing) => update({ allow_indexing })}
        />
      </label>
      <label className="admin-field">
        <span>
          <UiText text="搜索标题" />
        </span>
        <TextField
          disabled={disabled}
          value={settings.seo_title ?? ""}
          maxLength={200}
          placeholder={fields.title || "使用内容标题"}
          onChange={(event) => update({ seo_title: event.target.value })}
        />
      </label>
      <label className="admin-field">
        <span>
          <UiText text="搜索描述" />
        </span>
        <TextArea
          disabled={disabled}
          rows={4}
          maxLength={500}
          value={settings.seo_description ?? ""}
          placeholder="留空使用摘要"
          onChange={(event) => update({ seo_description: event.target.value })}
        />
      </label>
      <small>
        <UiText text="同时用于页面元信息和分享卡片；实际搜索结果由搜索引擎决定。" />
      </small>
    </Panel>
  );
}
/** UI panels are compiled registrations; backend declares supported IDs only. */
const panels: Readonly<Record<string, ComponentType<PanelProps>>> =
  Object.freeze({
    publication: PublicationPanel,
    access: AccessPanel,
    opening: OpeningPanel,
    cover: CoverPanel,
    taxonomy: CategoryPanel,
    tags: TagsPanel,
    discussion: DiscussionPanel,
    captcha: CaptchaPanel,
    seo: SeoPanel,
  });
export function EditorPanels({
  fields,
  onChange,
  ...props
}: Omit<PanelProps, "settings" | "update" | "updateFields"> & {
  onChange: (fields: DraftFields) => void;
}) {
  const settings = fields.settings ?? {};
  const update = (patch: Partial<EditorSettings>) =>
    onChange({ ...fields, settings: { ...settings, ...patch } });
  return (
    <aside className={styles.sidebar} aria-label="内容属性">
      {(
        props.type.panels ?? [
          "publication",
          "cover",
          "taxonomy",
          "discussion",
          "seo",
        ]
      )
        .flatMap((id) =>
          id === "taxonomy"
            ? ["taxonomy", "tags"]
            : id === "publication"
              ? ["publication", "access", "captcha", "opening"]
              : [id],
        )
        .filter((id, index, all) => all.indexOf(id) === index)
        .map((id) => {
          const Component = panels[id];
          return Component ? (
            <Component
              key={id}
              {...props}
              fields={fields}
              settings={settings}
              update={update}
              updateFields={(patch) => onChange({ ...fields, ...patch })}
            />
          ) : null;
        })}
    </aside>
  );
}
