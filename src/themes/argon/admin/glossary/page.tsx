"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { GlossaryContract } from "@/core/contracts/glossary";
import {
  createGlossaryHook,
  createGlossaryTerm,
  queryGlossaryTerms,
  readGlossaryTerm,
  updateGlossaryTerm,
} from "@/core/contracts/glossary";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { randomUUID } from "@/core/browser/crypto";
import { UiText, useLanguageCatalog, useT } from "@/core/i18n/provider";
import { can } from "@/core/accounts/permissions";
import { RequestError } from "@/core/http/request";
import type {
  ContentTypeDefinition,
  DraftBlock,
  DraftFields,
} from "@/core/contracts/content-admin";
import { commandBody, type BlockCommand } from "@/core/editor/block-commands";
import { hasUploadMarkers } from "@/core/editor/upload-placeholders";
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { useInlineImageUploads } from "@/core/content-management/use-inline-image-uploads";
import { useAppliedShortcodes } from "@/core/shortcodes/use-library";
import { glossaryTermPath } from "@/core/glossary/routes";
import { SeoDisclosure, SeoFieldsEditor } from "../components/seo-fields";
import { mediaReferenceId } from "@/core/media/references";
import { AdminPageHeading } from "../components/page-heading";
import { AdminActionButton } from "../components/action-button";
import { PermalinkField } from "../components/permalink-field";
import {
  SettingsSection,
  SettingsText,
  SettingsToggle,
} from "../settings/shared";
import { SettingsMediaField } from "../settings/media-field";
import { MediaPreview } from "../media/media-preview";
import { BlockComposer } from "../content/block-composer";
import { DraftPreview } from "../content/draft-preview";
import { EditorBody } from "../content/editor-body";
import { CodePreferencesProvider } from "../../components/code-preferences";
import { RouteLink } from "../../components/ui/route-link";
import {
  Button,
  Form,
  TextArea,
  TextField,
} from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { TokenField } from "../../components/ui/token-field";
import { Icon } from "../../components/icon";
import { MatchingRulesEditor } from "./matching-rules";
import { GlossaryTermHooks, type PendingGlossaryHook } from "./term-hooks";
import styles from "./glossary.module.css";

type List = NonNullable<GlossaryContract["list"]["data"]>;
type ListItem = List["items"][number];
type Detail = NonNullable<GlossaryContract["detail"]["data"]>;
type Fields = GlossaryContract["create"]["fields"];

const glossaryContentType = {
  id: "glossary",
  owner: "everunfold.glossary",
  label: "术语",
  description: "文章正文中的名词、别名与说明。",
  icon: "glossary",
  order: 0,
  title_required: true,
  supports_excerpt: false,
  editor: "core.markdown",
  panels: [],
} satisfies ContentTypeDefinition;

const statusMeta = {
  draft: { label: "草稿", icon: "edit", tone: "neutral" },
  published: { label: "已发布", icon: "check", tone: "positive" },
  archived: { label: "已归档", icon: "archive", tone: "warning" },
} as const;

const blankFields = (): Fields => ({
  language: "*",
  slug: "",
  title: "",
  summary: "",
  feature_media_id: null,
  show_image_viewer: true,
  body: [
    {
      id: randomUUID(),
      type: "markdown",
      content: "",
    },
  ],
  aliases: [],
  auto_match_title: true,
  match_rules: [],
  status: "draft",
});

function slugify(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function detailFields(value: Detail): Fields {
  return {
    language: value.language,
    slug: value.slug,
    title: value.title,
    summary: value.summary,
    feature_media_id: value.feature_media_id ?? null,
    allow_indexing: value.allow_indexing,
    seo_title: value.seo_title,
    seo_description: value.seo_description,
    seo_canonical_path: value.seo_canonical_path,
    seo_share_title: value.seo_share_title,
    seo_share_description: value.seo_share_description,
    seo_image_alt: value.seo_image_alt,
    seo_max_snippet: value.seo_max_snippet,
    seo_image_preview: value.seo_image_preview,
    seo_structured_data: value.seo_structured_data,
    share_image_media_id: value.share_image_media_id,
    show_image_viewer: value.show_image_viewer !== false,
    body: value.body.map((block) => ({ ...block })),
    aliases: value.aliases,
    auto_match_title: value.auto_match_title,
    match_rules: value.match_rules,
    status: value.status,
  };
}

function failureMessage(error: unknown) {
  if (error instanceof RequestError) {
    if (error.status === 409)
      return error.code === 40936
        ? "标题或别名与其他词条冲突。"
        : "内容已在其他窗口更新，请刷新词条后重试。";
    if (error.status === 422)
      return "请检查带 * 标记的必填项、匹配规则和长度限制。";
    if (error.status === 404) return "术语插件未启用或词条已不存在。";
  }
  return "暂时无法确认保存结果，当前输入已保留。";
}

export function GlossaryAdminPage() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const user = useAdminAccount();
  const writable = can(user, "content:write", null);
  const t = useT();
  const languages = useLanguageCatalog();
  const languageId = useId();
  const languageHintId = useId();
  const summaryId = useId();
  const statusId = useId();
  const statusHintId = useId();
  const resources = useEditorResources();
  const shortcodes = useAppliedShortcodes();
  const [catalog, setCatalog] = useState<List | null>(null);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [fields, setFields] = useState<Fields>(() => blankFields());
  const [baselineFields, setBaselineFields] = useState<Fields>(() => fields);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] =
    useState<GlossaryContract["query"]["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [featurePick, setFeaturePick] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newTermSession, setNewTermSession] = useState(() => randomUUID());
  const slugTouched = useRef(false);
  const pendingHooks = useRef<PendingGlossaryHook[]>([]);
  const operation = useRef<{ fingerprint: string; id: string } | null>(null);
  const transformBlock = useCallback(
    (id: string, change: (block: DraftBlock) => string) =>
      setFields((current) => ({
        ...current,
        body: current.body.map((block) =>
          block.id === id
            ? { ...block, content: change(block as DraftBlock) }
            : block,
        ),
      })),
    [],
  );
  const updateBlockContent = useCallback(
    (id: string, content: string) =>
      setFields((current) => ({
        ...current,
        body: current.body.map((block) =>
          block.id === id ? { ...block, content } : block,
        ),
      })),
    [],
  );
  const uploads = useInlineImageUploads({
    onTransform: transformBlock,
    onMedia: resources.remember,
  });
  const media = {
    ...selected?.media_urls,
    ...resources.media,
  };
  const normalizedFeatureId = fields.feature_media_id
    ? mediaReferenceId(fields.feature_media_id)
    : "";
  const pickedFeatureImage =
    featurePick && normalizedFeatureId === mediaReferenceId(featurePick.id)
      ? featurePick.url
      : "";
  const featureImage =
    pickedFeatureImage ||
    (fields.feature_media_id
      ? (media[fields.feature_media_id]?.original ??
        media[`media:${fields.feature_media_id}`]?.original ??
        selected?.feature_image?.original ??
        "")
      : "");
  const richValue = {
    title: fields.title,
    excerpt: fields.summary,
    body: fields.body,
  } as DraftFields;

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await queryGlossaryTerms(
        baseUrl,
        {
          search: appliedSearch,
          status,
          language: null,
          page: 1,
          page_size: 100,
        },
        csrfToken,
        { signal },
      );
      setCatalog(response.data);
    } catch (cause) {
      if (!signal?.aborted) setError(failureMessage(cause));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
    // Applied filters intentionally drive requests; input text does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch, baseUrl, csrfToken, status]);

  const startNew = () => {
    const value = blankFields();
    setSelected(null);
    setFields(value);
    setBaselineFields(value);
    setError("");
    setMessage("");
    setPreviewing(false);
    setFeaturePick(null);
    slugTouched.current = false;
    pendingHooks.current = [];
    setNewTermSession(randomUUID());
    operation.current = null;
  };

  const edit = async (item: ListItem) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await readGlossaryTerm(baseUrl, item.id);
      setSelected(response.data);
      const savedValue = detailFields(response.data);
      setFields(savedValue);
      setBaselineFields(savedValue);
      setPreviewing(false);
      setFeaturePick(null);
      slugTouched.current = true;
      operation.current = null;
    } catch (cause) {
      setError(failureMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const update = (patch: Partial<Fields>) =>
    setFields((current) => ({ ...current, ...patch }));
  const uploading = hasUploadMarkers(fields.body as DraftBlock[]);
  const reset = () => {
    setFields(baselineFields);
    setFeaturePick(null);
    setError("");
    setMessage("");
    if (!selected) {
      pendingHooks.current = [];
      setNewTermSession(randomUUID());
    }
  };

  async function save() {
    if (saving || dragging || uploading) return;
    const value: Fields = {
      ...fields,
      summary: (fields.summary ?? "").trim(),
      slug: fields.slug.trim() || slugify(fields.title),
    };
    if (!value.title.trim() || !value.slug) {
      setError("请填写带 * 标记的必填项：术语标题和路径片段。");
      return;
    }
    const fingerprint = JSON.stringify([
      selected?.id ?? "new",
      selected?.revision ?? 0,
      value,
    ]);
    if (operation.current?.fingerprint !== fingerprint)
      operation.current = { fingerprint, id: randomUUID() };
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = selected
        ? await updateGlossaryTerm(
            baseUrl,
            selected.id,
            {
              operation_id: operation.current.id,
              expected_revision: selected.revision,
              fields: value,
            },
            csrfToken,
          )
        : await createGlossaryTerm(
            baseUrl,
            {
              operation_id: operation.current.id,
              term_id: randomUUID(),
              fields: value,
            },
            csrfToken,
          );
      let hookError = "";
      let savedHooks = 0;
      if (!selected && pendingHooks.current.length) {
        for (const hook of pendingHooks.current) {
          try {
            await createGlossaryHook(
              baseUrl,
              {
                operation_id: hook.operationId,
                hook_id: hook.hookId,
                term_id: response.data.id,
                fields: hook.fields,
              },
              csrfToken,
            );
            savedHooks += 1;
          } catch {
            hookError =
              savedHooks > 0
                ? t(
                    "术语已保存，但只成功保存 {saved}/{total} 个页面触发。未成功的触发请重新添加。",
                    {
                      saved: savedHooks,
                      total: pendingHooks.current.length,
                    },
                  )
                : t("术语已保存，但页面触发暂未保存。请在新词条中重新添加。");
            break;
          }
        }
      }
      const pendingCount = pendingHooks.current.length;
      pendingHooks.current = [];
      setSelected(response.data);
      const savedValue = detailFields(response.data);
      setFields(savedValue);
      setBaselineFields(savedValue);
      setFeaturePick(null);
      operation.current = null;
      setMessage(
        hookError
          ? ""
          : pendingCount
            ? t("术语与 {count} 个页面触发已保存。", { count: savedHooks })
            : response.data.status === "published"
              ? "术语已发布。"
              : "术语已保存。",
      );
      if (hookError) setError(hookError);
      await load();
    } catch (cause) {
      setError(failureMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  const items = catalog?.items ?? [];
  const dirty = JSON.stringify(fields) !== JSON.stringify(baselineFields);
  const command = (change: BlockCommand) => {
    const body = commandBody(fields.body as DraftBlock[], change);
    if (!body) return false;
    update({ body });
    return true;
  };
  return (
    <div className={`admin-settings-page ${styles.page}`}>
      <AdminPageHeading
        title="术语表"
        description="维护正文自动命中的术语、标题规则、别名与正文提示。"
        action={
          writable ? (
            <AdminActionButton icon="plus" tone="accent" onClick={startNew}>
              <UiText text="新建术语" />
            </AdminActionButton>
          ) : undefined
        }
      />
      <div className={styles.workspace}>
        <section
          className={`admin-panel ${styles.catalog}`}
          aria-label="术语目录"
        >
          <header className={styles.catalogHeader}>
            <div>
              <span className="admin-eyebrow">
                <UiText text="术语目录" />
              </span>
              <h2>
                <UiText text="已维护词条" />
              </h2>
            </div>
            <div className={styles.catalogActions}>
              <span className="admin-badge">
                {catalog?.total ?? 0} <UiText text="项" />
              </span>
              <Button
                className="admin-icon-button"
                aria-label="刷新术语目录"
                title="刷新术语目录"
                disabled={loading}
                onClick={() => void load()}
              >
                <Icon
                  name="refresh"
                  className={loading ? "admin-draft-spin" : ""}
                />
              </Button>
            </div>
          </header>
          <div className={styles.catalogTools}>
            <Form
              className={styles.search}
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                setAppliedSearch(search.trim());
              }}
            >
              <label className="admin-search">
                <Icon name="search" />
                <TextField
                  type="search"
                  aria-label="搜索术语"
                  placeholder="标题、路径或说明"
                  maxLength={200}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <AdminActionButton type="submit" icon="search">
                <UiText text="搜索" />
              </AdminActionButton>
            </Form>
            <div
              className={`admin-draft-tabs ${styles.filters}`}
              aria-label="术语状态"
            >
              {(["all", "draft", "published", "archived"] as const).map(
                (value) => (
                  <Button
                    key={value}
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                  >
                    <UiText
                      text={value === "all" ? "全部" : statusMeta[value].label}
                    />
                  </Button>
                ),
              )}
            </div>
          </div>
          <div className={styles.list} aria-busy={loading}>
            {loading && !catalog ? (
              <div className="admin-draft-empty" role="status">
                <Icon name="refresh" className="admin-draft-spin" />
                <p>
                  <UiText text="正在读取术语…" />
                </p>
              </div>
            ) : null}
            {!loading && items.length === 0 ? (
              <div className="admin-draft-empty">
                <Icon name="glossary" />
                <h2>
                  <UiText text="还没有匹配的术语" />
                </h2>
                <p>
                  <UiText text="新建词条后，正文中命中的文字会自动出现提示。" />
                </p>
              </div>
            ) : null}
            {items.map((item) => {
              const meta = statusMeta[item.status];
              const featureImage =
                item.feature_image?.webp || item.feature_image?.original;
              return (
                <Button
                  key={item.id}
                  className={styles.row}
                  aria-current={selected?.id === item.id ? "true" : undefined}
                  onClick={() => void edit(item)}
                >
                  <span
                    className={styles.rowGlyph}
                    data-has-image={Boolean(featureImage)}
                  >
                    {featureImage ? (
                      <MediaPreview
                        url={featureImage}
                        kind="image"
                        label={item.title}
                      />
                    ) : (
                      <Icon name="glossary" />
                    )}
                  </span>
                  <span className={styles.rowCopy}>
                    <span className={styles.rowHeading}>
                      <strong>{item.title}</strong>
                      <span
                        className="admin-badge admin-status-badge"
                        data-tone={meta.tone}
                      >
                        <Icon name={meta.icon} />
                        <UiText text={meta.label} />
                      </span>
                    </span>
                    <small>/glossary/{item.slug}</small>
                  </span>
                  <Icon name="chevron" />
                </Button>
              );
            })}
          </div>
        </section>
        <Form
          className={styles.editor}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <header className={styles.editorHeader}>
            <div>
              <span className="admin-eyebrow">
                <UiText text={selected ? "词条编辑" : "新词条"} />
              </span>
              <h2>{selected ? selected.title : "新建术语"}</h2>
              <p>
                <UiText
                  text={
                    selected
                      ? "修改会作用于后续文章匹配；已打开页面的本地缓存到期后更新。"
                      : "术语标题默认作为第一条匹配规则，别名与其他规则可补充不同写法。"
                  }
                />
              </p>
            </div>
            <div className={styles.editorActions}>
              {selected?.status === "published" && (
                <RouteLink
                  className="admin-button admin-action-button"
                  href={
                    glossaryTermPath(selected, languages) ??
                    `/glossary/${encodeURIComponent(selected.slug)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="external" />
                  <UiText text="查看词条" />
                </RouteLink>
              )}
              {selected && (
                <span
                  className="admin-badge admin-status-badge"
                  data-tone={statusMeta[selected.status].tone}
                >
                  <Icon name={statusMeta[selected.status].icon} />
                  <UiText text={statusMeta[selected.status].label} />
                </span>
              )}
            </div>
          </header>
          <fieldset
            className={`admin-settings-form ${styles.form}`}
            disabled={!writable || saving}
          >
            <SettingsSection
              id="glossary-basics"
              title="基本信息"
              description="标题、地址和语言共同确定词条的公开身份。"
            >
              <div className="admin-settings-two-col">
                <SettingsText
                  label="术语标题"
                  required
                  hint="标题默认参与匹配，可在下方规则中关闭。"
                  value={fields.title}
                  maxLength={120}
                  placeholder="例如：专有名词"
                  onChange={(title) =>
                    setFields((current) => ({
                      ...current,
                      title,
                      slug: slugTouched.current ? current.slug : slugify(title),
                    }))
                  }
                />
                <div className="admin-settings-field">
                  <label htmlFor={languageId}>
                    <UiText text="内容语言" />
                  </label>
                  <Select
                    id={languageId}
                    name="glossary-language"
                    label="内容语言"
                    aria-describedby={languageHintId}
                    value={fields.language}
                    options={[
                      {
                        value: "*",
                        label: "全部语言匹配",
                        flag: "🌐",
                      },
                      ...languages.languages.map((item) => ({
                        value: item.code,
                        label: item.name,
                        flag: item.flag,
                      })),
                    ]}
                    onValueChange={(language) => update({ language })}
                  />
                  <small id={languageHintId}>
                    <UiText text="选择具体语言时只匹配该语言；全部语言会对任意文章生效。" />
                  </small>
                </div>
              </div>
              <PermalinkField
                key={selected?.id ?? newTermSession}
                value={fields.slug}
                displayValue={
                  fields.slug
                    ? decodeURI(
                        glossaryTermPath(
                          {
                            slug: fields.slug,
                            language: fields.language ?? "*",
                          },
                          languages,
                        ) ?? "",
                      ) || `/glossary/${fields.slug}`
                    : ""
                }
                disabled={!writable || saving}
                maxLength={120}
                placeholder="例如：proper-noun"
                validate={(slug) =>
                  /[\s/?#%<>\\]/u.test(slug) || slug === "." || slug === ".."
                    ? "请输入有效的术语路径片段。"
                    : ""
                }
                onChange={(slug) => {
                  slugTouched.current = Boolean(slug);
                  update({ slug: slug || slugify(fields.title) });
                }}
              />
              <SettingsMediaField
                allowUrl={false}
                label="特色图片"
                hint="可留空；从媒体库选择后会显示在术语目录和词条详情中。"
                kind="image"
                value={featureImage}
                mediaId={
                  fields.feature_media_id
                    ? `media:${fields.feature_media_id}`
                    : undefined
                }
                onChange={(url, id) => {
                  setFeaturePick(
                    id
                      ? {
                          id: mediaReferenceId(id),
                          url,
                        }
                      : null,
                  );
                  update({
                    feature_media_id: id ? mediaReferenceId(id) : null,
                  });
                }}
              />
              <SettingsToggle
                label="特色图片与正文图片点击查看"
                hint="关闭后只影响当前术语；图片仍正常显示，但不会打开查看器。"
                value={fields.show_image_viewer !== false}
                onChange={(show_image_viewer) => update({ show_image_viewer })}
              />
            </SettingsSection>
            <SettingsSection
              id="glossary-aliases"
              title="术语别名"
              description="别名独立于匹配规则，会参与正文命中、全局搜索和公开词条展示。"
            >
              <TokenField
                label="术语别名"
                value={fields.aliases ?? []}
                onChange={(aliases) => update({ aliases })}
                multiple
                limit={20}
                compactLabel
                disabled={!writable || saving}
              />
            </SettingsSection>
            <SettingsSection
              id="glossary-body"
              title="术语正文"
              description="与文章共用富文本区块、格式、代码、公式、媒体和预览能力。"
              action={
                <AdminActionButton
                  icon={previewing ? "edit" : "eye"}
                  aria-pressed={previewing}
                  onClick={() => setPreviewing((value) => !value)}
                >
                  <UiText text={previewing ? "返回编辑" : "正文预览"} />
                </AdminActionButton>
              }
            >
              <CodePreferencesProvider value={resources.codePreferences}>
                {previewing ? (
                  <div className={styles.preview}>
                    <DraftPreview
                      fields={richValue}
                      media={media}
                      shortcodes={shortcodes}
                    />
                  </div>
                ) : (
                  <div className={styles.richEditor}>
                    <BlockComposer
                      body={fields.body as DraftBlock[]}
                      disabled={!writable || saving || loading}
                      command={command}
                      onBusyChange={setDragging}
                    >
                      <EditorBody
                        session={null}
                        type={glossaryContentType}
                        value={richValue}
                        onChange={(value) =>
                          update({ body: value.body as Fields["body"] })
                        }
                        disabled={!writable || saving || loading}
                        onMedia={resources.remember}
                        media={media}
                        onBlockChange={updateBlockContent}
                        stagedBlocks={[]}
                        uploads={uploads}
                        locked={() => false}
                      />
                    </BlockComposer>
                  </div>
                )}
              </CodePreferencesProvider>
            </SettingsSection>
            <SettingsSection
              id="glossary-matching"
              title="匹配规则"
              description="在标题和别名之外补充普通匹配或受限正则，并在保存前验证匹配结果。"
            >
              <MatchingRulesEditor
                fields={fields}
                onChange={update}
                baseUrl={baseUrl}
                csrfToken={csrfToken}
                disabled={!writable || saving}
              />
            </SettingsSection>
            <GlossaryTermHooks
              key={selected?.id ?? newTermSession}
              termId={selected?.id ?? null}
              writable={writable}
              onPendingHooksChange={(hooks) => {
                pendingHooks.current = hooks;
              }}
            />
            <SettingsSection
              id="glossary-content"
              title="悬浮提示"
              description="简短摘要可留空；默认悬浮内容直接使用上方术语正文。"
            >
              <div className="admin-settings-field">
                <label htmlFor={summaryId}>
                  <UiText text="简短提示（可选）" />
                </label>
                <TextArea
                  id={summaryId}
                  value={fields.summary ?? ""}
                  rows={3}
                  maxLength={500}
                  placeholder="可留空；默认直接使用上方术语正文作为悬浮内容。"
                  onChange={(event) => update({ summary: event.target.value })}
                />
                <small>
                  <UiText text="可选。仅在站点提示内容来源设为“简短提示”时使用。" />
                </small>
              </div>
            </SettingsSection>
            <SeoDisclosure
              key={selected?.id ?? newTermSession}
              label="搜索与分享"
            >
              <SeoFieldsEditor
                value={fields}
                onChange={update}
                disabled={!writable || saving}
                content={{
                  kind: "glossary",
                  id: selected?.id,
                  title: fields.title,
                  summary: fields.summary,
                  path:
                    fields.slug || slugify(fields.title)
                      ? glossaryTermPath(
                          {
                            slug: fields.slug || slugify(fields.title),
                            language: fields.language ?? "*",
                          },
                          languages,
                        )
                      : undefined,
                  language:
                    fields.language === "*"
                      ? languages.default_code
                      : fields.language,
                  cover: featureImage,
                  share_image_url:
                    fields.share_image_media_id &&
                    fields.share_image_media_id ===
                      selected?.share_image_media_id
                      ? selected.share_image_url
                      : undefined,
                  published: selected?.status === "published",
                  aliases: fields.aliases,
                }}
              />
            </SeoDisclosure>
            <SettingsSection
              id="glossary-publication"
              title="发布状态"
              description="草稿不会公开；归档会保留记录，但停止出现在目录和正文提示中。"
            >
              <div className="admin-settings-field">
                <label htmlFor={statusId}>
                  <UiText text="状态" />
                </label>
                <Select
                  id={statusId}
                  name="glossary-status"
                  label="发布状态"
                  aria-describedby={statusHintId}
                  value={fields.status}
                  options={Object.entries(statusMeta).map(([value, item]) => ({
                    value,
                    label: item.label,
                  }))}
                  onValueChange={(value) =>
                    update({ status: value as Fields["status"] })
                  }
                />
                <small id={statusHintId}>
                  <UiText text="发布后会进入公开术语目录，并在命中的文章中显示提示。" />
                </small>
              </div>
            </SettingsSection>
          </fieldset>
          {error && (
            <div className="admin-settings-message is-error" role="alert">
              <Icon name="warning" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <p className="admin-settings-message" role="status">
              <Icon name="check" />
              <span>{message}</span>
            </p>
          )}
          <div className="admin-settings-savebar">
            <div>
              <span>
                {selected
                  ? `已读取版本 ${selected.revision}`
                  : writable
                    ? "新术语尚未保存"
                    : "当前账号只有读取权限"}
              </span>
              <div className="admin-settings-delivery">
                {selected ? (
                  <span
                    className="admin-badge admin-status-badge"
                    data-tone={statusMeta[selected.status].tone}
                  >
                    <Icon name={statusMeta[selected.status].icon} />
                    <UiText text={statusMeta[selected.status].label} />
                  </span>
                ) : (
                  <span className="admin-badge">
                    <UiText text="新词条" />
                  </span>
                )}
              </div>
            </div>
            <div className="admin-settings-actions">
              <Button
                className="admin-button"
                disabled={!writable || saving || !dirty}
                onClick={reset}
              >
                <UiText text="撤销修改" />
              </Button>
              <Button
                className="admin-button admin-button-primary"
                type="submit"
                disabled={
                  !writable || saving || !dirty || uploading || dragging
                }
              >
                <Icon name="check" />
                <UiText text={saving ? "正在保存" : "保存更改"} />
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
