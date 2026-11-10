"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { GlossaryContract } from "@/core/contracts/glossary";
import {
  createGlossaryTerm,
  queryGlossaryTerms,
  readGlossaryTerm,
  updateGlossaryTerm,
} from "@/core/contracts/glossary";
import { useAdminRequest } from "@/core/admin/account-context";
import { randomUUID } from "@/core/browser/crypto";
import { useLanguageCatalog } from "@/core/i18n/provider";
import { RequestError } from "@/core/http/request";
import { AdminPageHeading } from "../components/page-heading";
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
  const languages = useLanguageCatalog();
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
  const statusLabel = useMemo(
    () => ({ draft: "草稿", published: "已发布", archived: "已归档" }),
    [],
  );
  return (
    <>
      <AdminPageHeading
        title="术语表"
        description="维护正文自动命中的术语、别名与提示内容。"
        action={
          <Button
            className="admin-button admin-button-primary"
            onClick={startNew}
          >
            <Icon name="plus" />
            新建术语
          </Button>
        }
      />
      <div className={styles.layout}>
        <section
          className={`admin-surface ${styles.catalog}`}
          aria-label="术语目录"
        >
          <Form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedSearch(search.trim());
            }}
          >
            <TextField
              type="search"
              aria-label="搜索术语"
              placeholder="标题、路径或说明"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit" className="admin-button">
              搜索
            </Button>
          </Form>
          <div className={styles.filters}>
            {(["all", "draft", "published", "archived"] as const).map(
              (value) => (
                <Button
                  key={value}
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                >
                  {value === "all" ? "全部" : statusLabel[value]}
                </Button>
              ),
            )}
          </div>
          <div className={styles.list} aria-busy={loading}>
            {loading && !catalog ? <p role="status">正在读取术语…</p> : null}
            {!loading && items.length === 0 ? <p>还没有匹配的术语。</p> : null}
            {items.map((item) => (
              <Button
                key={item.id}
                className={styles.row}
                aria-current={selected?.id === item.id ? "true" : undefined}
                onClick={() => void edit(item)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    /glossary/{item.slug} · {statusLabel[item.status]}
                  </small>
                </span>
                <Icon name="chevron" />
              </Button>
            ))}
          </div>
        </section>
        <Form
          className={`admin-surface ${styles.editor}`}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <header>
            <div>
              <h2>{selected ? `编辑「${selected.title}」` : "新建术语"}</h2>
              <small>
                {selected
                  ? `修订 ${selected.revision} · 最后更新 ${new Date(selected.updated_at).toLocaleString("zh-CN")}`
                  : "标题和别名会在文章正文中自动匹配。"}
              </small>
            </div>
            {selected && (
              <span className={styles.badge}>
                {statusLabel[selected.status]}
              </span>
            )}
          </header>
          <div className="admin-settings-two-col">
            <label className="admin-field">
              <span>术语标题</span>
              <TextField
                value={fields.title}
                maxLength={120}
                onChange={(event) => {
                  const title = event.target.value;
                  setFields((current) => ({
                    ...current,
                    title,
                    slug: slugTouched.current ? current.slug : slugify(title),
                  }));
                }}
              />
            </label>
            <label className="admin-field">
              <span>内容语言</span>
              <Select
                name="glossary-language"
                label="内容语言"
                value={fields.language}
                options={languages.languages.map((item) => ({
                  value: item.code,
                  label: item.name,
                }))}
                onValueChange={(language) => update({ language })}
              />
            </label>
          </div>
          <label className="admin-field">
            <span>路径片段</span>
            <TextField
              value={fields.slug}
              maxLength={120}
              onChange={(event) => {
                slugTouched.current = true;
                update({ slug: event.target.value });
              }}
            />
            <small>公开地址：/glossary/{fields.slug || "term-slug"}</small>
          </label>
          <label className="admin-field">
            <span>悬浮提示</span>
            <TextArea
              value={fields.summary}
              rows={3}
              maxLength={500}
              placeholder="鼠标悬停、键盘聚焦或触屏点按时显示。"
              onChange={(event) => update({ summary: event.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>匹配文字</span>
            <TextArea
              value={aliasText}
              rows={4}
              placeholder={"每行一个别名，也可用逗号分隔\n例如：金灵\njinling"}
              onChange={(event) => setAliasText(event.target.value)}
            />
            <small>
              术语标题本身也会参与匹配；同一语言内不能与其他词条重复。
            </small>
          </label>
          <label className="admin-field">
            <span>完整说明（Markdown）</span>
            <TextArea
              value={fields.body_markdown}
              rows={10}
              maxLength={20000}
              onChange={(event) =>
                update({ body_markdown: event.target.value })
              }
            />
          </label>
          <label className="admin-field">
            <span>发布状态</span>
            <Select
              name="glossary-status"
              label="发布状态"
              value={fields.status}
              options={[
                { value: "draft", label: "草稿" },
                { value: "published", label: "已发布" },
                { value: "archived", label: "已归档" },
              ]}
              onValueChange={(value) =>
                update({ status: value as Fields["status"] })
              }
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className={styles.message} role="status">
              {message}
            </p>
          )}
          <footer>
            <Button type="button" className="admin-button" onClick={startNew}>
              清空
            </Button>
            <Button
              type="submit"
              className="admin-button admin-button-primary"
              disabled={saving}
            >
              <Icon name={saving ? "refresh" : "check"} />
              {saving ? "正在保存" : selected ? "保存更改" : "创建术语"}
            </Button>
          </footer>
        </Form>
      </div>
    </>
  );
}
