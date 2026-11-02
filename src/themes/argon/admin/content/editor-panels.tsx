"use client";
import { useId, useState, type ComponentType, type ReactNode } from "react";
import type {
  ContentTypeDefinition,
  DraftFields,
  DraftDetail,
  EditorSettings,
  EditorTerm,
  MediaURL,
} from "@/generated/content-admin-contract";
import type { MediaItem } from "@/generated/settings-contract";
import {
  formatEditorDate,
  parseEditorDate,
} from "@/core/content-management/editor-fields";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import { Switch } from "../../components/ui/switch";
import { TokenField } from "../../components/ui/token-field";
import { Icon } from "../../components/icon";
import { MediaPreview } from "../media/media-preview";
import { EditorMediaDialog } from "./editor-media-dialog";
import styles from "./editor-workspace.module.css";

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
        {title}
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
}
function PublicationPanel({ settings, update, detail, disabled }: PanelProps) {
  const date = formatEditorDate(settings.display_published_at);
  const invalidDate = Boolean(
    date && !/^\d{4}-\d{2}-\d{2}T/.test(settings.display_published_at ?? ""),
  );
  return (
    <Panel title="发布设置">
      <dl className={styles.publicationInfo}>
        <div>
          <dt>状态</dt>
          <dd>
            {detail?.published_revision ? "已发布 · 可继续编辑草稿" : "草稿"}
          </dd>
        </div>
        <div>
          <dt>作者</dt>
          <dd>{detail?.author || "当前登录用户"}</dd>
        </div>
      </dl>
      <label className="admin-field">
        <span>访问路径</span>
        <TextField
          value={settings.path ?? ""}
          placeholder={detail?.public_path || "/posts/自定义路径.html"}
          maxLength={500}
          disabled={disabled}
          onChange={(event) => update({ path: event.target.value })}
        />
        <small>留空使用原路径；新内容自动生成。改址后旧链接不再可用。</small>
      </label>
      <label className="admin-field">
        <span>显示时间</span>
        <TextField
          value={date}
          disabled={disabled}
          placeholder="YYYY-MM-DD HH:mm"
          aria-invalid={invalidDate}
          onChange={(event) =>
            update({
              display_published_at: parseEditorDate(event.target.value),
            })
          }
        />
        <small>
          {invalidDate
            ? "请输入有效日期，如 2026-11-02 14:30。"
            : "按当前设备时区填写；留空保留原时间，新内容使用发布时间。"}
        </small>
      </label>
      <div className={styles.switchRow}>
        <span>首页置顶</span>
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
              {settings.cover_media_id
                ? "封面暂不可预览 · 重新选择"
                : "从媒体库选择"}
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
          <Icon name="trash" /> 移除封面
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
function TaxonomyPanel({
  type,
  settings,
  update,
  terms,
  disabled,
}: PanelProps) {
  return (
    <Panel title="分类与标签" initialOpen={type.id === "article"}>
      <TokenField
        label="分类"
        value={settings.categories ?? []}
        limit={20}
        disabled={disabled}
        suggestions={terms
          .filter((term) => term.kind === "category")
          .map((term) => term.name)}
        onChange={(categories) => update({ categories })}
      />
      <TokenField
        label="标签"
        value={settings.tags ?? []}
        disabled={disabled}
        suggestions={terms
          .filter((term) => term.kind === "tag")
          .map((term) => term.name)}
        onChange={(tags) => update({ tags })}
      />
    </Panel>
  );
}
function DiscussionPanel({ settings, update, disabled }: PanelProps) {
  return (
    <Panel title="讨论" initialOpen={false}>
      <div className={styles.switchRow}>
        <span>允许评论</span>
        <Switch
          aria-label="允许评论"
          checked={settings.comments_open ?? true}
          disabled={disabled}
          onCheckedChange={(comments_open) => update({ comments_open })}
        />
      </div>
      <small>关闭后保留已有留言，隐藏回复与写留言入口。</small>
    </Panel>
  );
}
function SeoPanel({ settings, update, fields, disabled }: PanelProps) {
  return (
    <Panel title="搜索展示" initialOpen={false}>
      <label className="admin-field">
        <span>搜索标题</span>
        <TextField
          disabled={disabled}
          value={settings.seo_title ?? ""}
          maxLength={200}
          placeholder={fields.title || "使用内容标题"}
          onChange={(event) => update({ seo_title: event.target.value })}
        />
      </label>
      <label className="admin-field">
        <span>搜索描述</span>
        <TextArea
          disabled={disabled}
          rows={4}
          maxLength={500}
          value={settings.seo_description ?? ""}
          placeholder="留空使用摘要"
          onChange={(event) => update({ seo_description: event.target.value })}
        />
      </label>
      <small>同时用于页面元信息和分享卡片；实际搜索结果由搜索引擎决定。</small>
    </Panel>
  );
}
/** UI panels are compiled registrations; backend declares supported IDs only. */
const panels: Readonly<Record<string, ComponentType<PanelProps>>> =
  Object.freeze({
    publication: PublicationPanel,
    cover: CoverPanel,
    taxonomy: TaxonomyPanel,
    discussion: DiscussionPanel,
    seo: SeoPanel,
  });
export function EditorPanels({
  fields,
  onChange,
  ...props
}: Omit<PanelProps, "settings" | "update"> & {
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
      ).map((id) => {
        const Component = panels[id];
        return Component ? (
          <Component
            key={id}
            {...props}
            fields={fields}
            settings={settings}
            update={update}
          />
        ) : null;
      })}
    </aside>
  );
}
