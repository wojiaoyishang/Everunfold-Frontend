"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { GlossaryContract } from "@/core/contracts/glossary";
import {
  createGlossaryTerm,
  queryGlossaryTerms,
  readGlossaryTerm,
  updateGlossaryTerm,
} from "@/core/contracts/glossary";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { randomUUID } from "@/core/browser/crypto";
import { UiText, useLanguageCatalog } from "@/core/i18n/provider";
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
import { AdminPageHeading } from "../components/page-heading";
import { AdminActionButton } from "../components/action-button";
import { SettingsSection, SettingsText } from "../settings/shared";
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
import { Icon } from "../../components/icon";
import { MatchingRulesEditor } from "./matching-rules";
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
    if (error.status === 422) return "请检查标题、路径、别名和长度限制。";
    if (error.status === 404) return "术语插件未启用或词条已不存在。";
  }
  return "暂时无法确认保存结果，当前输入已保留。";
}

export function GlossaryAdminPage() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const user = useAdminAccount();
  const writable = can(user, "content:write", null);
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const slugTouched = useRef(false);
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
    slugTouched.current = false;
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
    setError("");
    setMessage("");
  };

  async function save() {
    if (saving || dragging || uploading) return;
    const value: Fields = {
      ...fields,
      slug: fields.slug.trim() || slugify(fields.title),
    };
    if (!value.title.trim() || !value.summary.trim() || !value.slug) {
      setError("标题、路径和提示说明不能为空。");
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
      setSelected(response.data);
      const savedValue = detailFields(response.data);
      setFields(savedValue);
      setBaselineFields(savedValue);
      operation.current = null;
      setMessage(
        response.data.status === "published" ? "术语已发布。" : "术语已保存。",
      );
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
        description="维护正文自动命中的术语、别名与提示内容。"
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
              return (
                <Button
                  key={item.id}
                  className={styles.row}
                  aria-current={selected?.id === item.id ? "true" : undefined}
                  onClick={() => void edit(item)}
                >
                  <span className={styles.rowGlyph}>
                    <Icon name="glossary" />
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
                      : "标题会作为默认匹配词，别名可以补充不同写法。"
                  }
                />
              </p>
            </div>
            <div className={styles.editorActions}>
              <AdminActionButton
                icon={previewing ? "edit" : "eye"}
                aria-pressed={previewing}
                onClick={() => setPreviewing((value) => !value)}
              >
                <UiText text={previewing ? "返回编辑" : "正文预览"} />
              </AdminActionButton>
              {selected?.status === "published" && (
                <RouteLink
                  className="admin-button admin-action-button"
                  href={`/glossary/${selected.slug}`}
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
              <SettingsText
                label="路径片段"
                hint={`公开地址：/glossary/${fields.slug || "term-slug"}`}
                value={fields.slug}
                maxLength={120}
                placeholder="例如：proper-noun"
                onChange={(slug) => {
                  slugTouched.current = true;
                  update({ slug });
                }}
              />
            </SettingsSection>
            <SettingsSection
              id="glossary-body"
              title="术语正文"
              description="与文章共用富文本区块、格式、代码、公式、媒体和预览能力。"
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
              description="分别控制术语标题、普通匹配与受限正则，并在保存前验证匹配结果。"
            >
              <MatchingRulesEditor
                fields={fields}
                onChange={update}
                baseUrl={baseUrl}
                csrfToken={csrfToken}
                disabled={!writable || saving}
              />
            </SettingsSection>
            <SettingsSection
              id="glossary-content"
              title="悬浮提示"
              description="默认弹层使用的简短说明；完整内容由上方术语正文提供。"
            >
              <div className="admin-settings-field">
                <label htmlFor={summaryId}>
                  <UiText text="悬浮提示" />
                </label>
                <TextArea
                  id={summaryId}
                  value={fields.summary}
                  rows={3}
                  maxLength={500}
                  placeholder="鼠标悬停、键盘聚焦或触屏点按时显示。"
                  onChange={(event) => update({ summary: event.target.value })}
                />
                <small>
                  <UiText text="建议用一句或两句话说明这个词在本站语境中的含义。" />
                </small>
              </div>
            </SettingsSection>
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
