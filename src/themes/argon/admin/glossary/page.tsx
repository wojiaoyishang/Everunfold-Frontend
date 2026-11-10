"use client";

import { useEffect, useId, useRef, useState } from "react";

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
import { AdminPageHeading } from "../components/page-heading";
import { AdminActionButton } from "../components/action-button";
import { SettingsSection, SettingsText } from "../settings/shared";
import {
  Button,
  Form,
  TextArea,
  TextField,
} from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
import styles from "./glossary.module.css";

type List = NonNullable<GlossaryContract["list"]["data"]>;
type ListItem = List["items"][number];
type Detail = NonNullable<GlossaryContract["detail"]["data"]>;
type Fields = GlossaryContract["create"]["fields"];

const statusMeta = {
  draft: { label: "草稿", icon: "edit", tone: "neutral" },
  published: { label: "已发布", icon: "check", tone: "positive" },
  archived: { label: "已归档", icon: "archive", tone: "warning" },
} as const;

const blankFields = (language: string): Fields => ({
  language,
  slug: "",
  title: "",
  summary: "",
  body_markdown: "",
  aliases: [],
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

function aliasesOf(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,，]/u)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

function detailFields(value: Detail): Fields {
  return {
    language: value.language,
    slug: value.slug,
    title: value.title,
    summary: value.summary,
    body_markdown: value.body_markdown,
    aliases: value.aliases,
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
  const aliasesId = useId();
  const bodyId = useId();
  const statusId = useId();
  const statusHintId = useId();
  const [catalog, setCatalog] = useState<List | null>(null);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [fields, setFields] = useState<Fields>(() =>
    blankFields(languages.default_code),
  );
  const [aliasText, setAliasText] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] =
    useState<GlossaryContract["query"]["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const slugTouched = useRef(false);
  const operation = useRef<{ fingerprint: string; id: string } | null>(null);

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
    setSelected(null);
    setFields(blankFields(languages.default_code));
    setAliasText("");
    setError("");
    setMessage("");
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
      setFields(detailFields(response.data));
      setAliasText(response.data.aliases.join("\n"));
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

  async function save() {
    if (saving) return;
    const value: Fields = {
      ...fields,
      aliases: aliasesOf(aliasText),
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
      setFields(detailFields(response.data));
      setAliasText(response.data.aliases.join("\n"));
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
            {selected && (
              <span
                className="admin-badge admin-status-badge"
                data-tone={statusMeta[selected.status].tone}
              >
                <Icon name={statusMeta[selected.status].icon} />
                <UiText text={statusMeta[selected.status].label} />
              </span>
            )}
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
                  hint="标题本身会自动参与正文匹配。"
                  value={fields.title}
                  maxLength={120}
                  placeholder="例如：金灵"
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
                    options={languages.languages.map((item) => ({
                      value: item.code,
                      label: item.name,
                    }))}
                    onValueChange={(language) => update({ language })}
                  />
                  <small id={languageHintId}>
                    <UiText text="只有与文章语言相同的词条会参与匹配。" />
                  </small>
                </div>
              </div>
              <SettingsText
                label="路径片段"
                hint={`公开地址：/glossary/${fields.slug || "term-slug"}`}
                value={fields.slug}
                maxLength={120}
                placeholder="例如：jin-ling"
                onChange={(slug) => {
                  slugTouched.current = true;
                  update({ slug });
                }}
              />
            </SettingsSection>
            <SettingsSection
              id="glossary-matching"
              title="匹配规则"
              description="标题始终参与匹配；这里补充其他常见写法。"
            >
              <div className="admin-settings-field">
                <label htmlFor={aliasesId}>
                  <UiText text="匹配文字" />
                </label>
                <TextArea
                  id={aliasesId}
                  value={aliasText}
                  rows={4}
                  placeholder={
                    "每行一个别名，也可用逗号分隔\n例如：金灵\njinling"
                  }
                  onChange={(event) => setAliasText(event.target.value)}
                />
                <small>
                  <UiText text="同一语言内不能与其他词条的标题或别名重复。" />
                </small>
              </div>
            </SettingsSection>
            <SettingsSection
              id="glossary-content"
              title="提示内容"
              description="简短提示用于默认弹层，完整说明用于详情页或展开阅读。"
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
              <div className="admin-settings-field">
                <label htmlFor={bodyId}>
                  <UiText text="完整说明（Markdown）" />
                </label>
                <TextArea
                  id={bodyId}
                  value={fields.body_markdown}
                  rows={12}
                  maxLength={20000}
                  placeholder="补充词条的背景、来源或相关故事。"
                  onChange={(event) =>
                    update({ body_markdown: event.target.value })
                  }
                />
                <small>
                  <UiText text="支持安全 Markdown；留空时公开详情页回退到悬浮提示。" />
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
                  ? `修订 ${selected.revision} · 最后更新 ${new Date(selected.updated_at).toLocaleString("zh-CN")}`
                  : writable
                    ? "新术语尚未保存"
                    : "当前账号只有读取权限"}
              </span>
            </div>
            <div className="admin-settings-actions">
              <AdminActionButton
                icon="undo"
                disabled={!writable || saving}
                onClick={startNew}
              >
                <UiText text="清空" />
              </AdminActionButton>
              <AdminActionButton
                type="submit"
                icon={saving ? "refresh" : "save"}
                tone="accent"
                disabled={!writable || saving}
              >
                <UiText
                  text={
                    saving ? "正在保存" : selected ? "保存更改" : "创建术语"
                  }
                />
              </AdminActionButton>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
