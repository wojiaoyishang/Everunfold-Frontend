"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  TranslationCatalogEntry,
  TranslationChange,
} from "@/core/contracts/settings";
import { useLanguageCatalog, UiText, useT } from "@/core/i18n/provider";
import english from "@/core/i18n/en.json";
import { useTranslationSettings } from "@/core/settings/use-translations";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { CodeEditor } from "../../components/ui/code-editor";
import { DownloadButton } from "../../components/ui/download-button";
import { FilePicker } from "../../components/ui/file-picker";
import { Icon } from "../../components/icon";
import { LanguageFlag } from "../../components/language-flag";
import { AdminPageHeading } from "../components/page-heading";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { SettingsLayout } from "./section-navigation";
import { SettingsSection } from "./shared";
import {
  draftIdentity,
  parseTranslationBundle,
  serializeTranslationBundle,
} from "@/core/settings/translation-transfer";
import styles from "./translations.module.css";

type Scope = "public" | "admin" | "backend";
type ScopeFilter = Scope | "all";
type Status = "all" | "custom" | "missing" | "fallback" | "stale";
type Item = TranslationCatalogEntry;

const scopes: { value: Scope; label: string; hint: string }[] = [
  {
    value: "public",
    label: "前台界面",
    hint: "访客阅读、搜索、评论和公开组件。",
  },
  {
    value: "admin",
    label: "后台界面",
    hint: "管理页面、表单状态和后台提示。",
  },
  {
    value: "backend",
    label: "API 消息",
    hint: "后端以稳定消息键提供的提示文本。",
  },
];
const scopeFilters: {
  value: ScopeFilter;
  label: string;
  hint: string;
}[] = [
  {
    value: "all",
    label: "全部范围",
    hint: "所有界面范围与 API 消息。",
  },
  ...scopes,
];

const frontendCatalog: Item[] = Object.entries(
  english as Record<string, string>,
).map(([source, value]) => ({
  scope: "public",
  key: source,
  owner: "frontend",
  source,
  defaults: { "zh-CN": source, en: value },
}));

function identity(scope: Scope, locale: string, key: string) {
  return `${scope}\0${locale}\0${key}`;
}

function placeholderSignature(value: string) {
  return [...value.matchAll(/(?<!\{)\{([a-zA-Z_]\w*)\}(?!\})/g)]
    .map((match) => match[1])
    .sort()
    .join(",");
}

function parseScope(value: string | null): Scope | undefined {
  return scopes.find((item) => item.value === value)?.value;
}

function parseScopeFilter(value: string | null): ScopeFilter | undefined {
  return scopeFilters.find((item) => item.value === value)?.value;
}

type TranslationRow = {
  item: Item;
  current: string;
  state: "custom" | "fallback" | "missing";
};

function TranslationToolbar({
  scope,
  locale,
  status,
  search,
  languageOptions,
  onScope,
  onLocale,
  onStatus,
  onSearch,
}: {
  scope: ScopeFilter;
  locale: string;
  status: Status;
  search: string;
  languageOptions: {
    value: string;
    label: string;
    flag?: string;
  }[];
  onScope: (value: ScopeFilter) => void;
  onLocale: (value: string) => void;
  onStatus: (value: Status) => void;
  onSearch: (value: string) => void;
}) {
  return (
    <div className={styles.filters}>
      <div className={styles.filter}>
        <span className={styles.fieldLabel}>
          <UiText text="翻译范围" />
        </span>
        <Select
          programOptions
          name="translation-scope"
          label="翻译范围"
          value={scope}
          options={scopeFilters.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
          onValueChange={(value) => onScope(value as ScopeFilter)}
        />
      </div>
      <div className={styles.filter}>
        <span className={styles.fieldLabel}>
          <UiText text="翻译语言" />
        </span>
        <Select
          programOptions
          name="translation-locale"
          label="翻译语言"
          value={locale}
          options={languageOptions}
          onValueChange={onLocale}
        />
      </div>
      <div className={styles.filter}>
        <span className={styles.fieldLabel}>
          <UiText text="翻译状态" />
        </span>
        <Select
          programOptions
          name="translation-status"
          label="翻译状态"
          value={status}
          options={[
            { value: "all", label: "全部" },
            { value: "custom", label: "已自定义" },
            { value: "missing", label: "未翻译" },
            { value: "fallback", label: "使用回退" },
            { value: "stale", label: "原文已变化" },
          ]}
          onValueChange={(value) => onStatus(value as Status)}
        />
      </div>
      <div className={styles.filter}>
        <span className={styles.fieldLabel}>
          <UiText text="搜索" />
        </span>
        <label className="admin-search">
          <Icon name="search" />
          <TextField
            type="search"
            aria-label="搜索翻译字符串"
            placeholder="原文、消息键或当前翻译"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

function TranslationProgress({
  translated,
  fallback,
  missing,
}: {
  translated: number;
  fallback: number;
  missing: number;
}) {
  const t = useT();
  const total = translated + fallback + missing;
  const percent = (value: number) => (total ? (value / total) * 100 : 0);
  const translatedPercent = percent(translated);
  const fallbackPercent = percent(fallback);
  const missingPercent = Math.max(0, 100 - translatedPercent - fallbackPercent);
  const percentLabel = (value: number) =>
    value > 0 && value < 0.1 ? "<0.1" : String(Math.round(value * 10) / 10);
  return (
    <div className={styles.progressPanel}>
      <div className={styles.progressHeading}>
        <strong>
          <UiText text="翻译进度" />
        </strong>
        <span>
          {percentLabel(translatedPercent)}% · {total}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={t(
          "已翻译 {translated}%，默认翻译 {fallback}%，未翻译 {missing}%",
          {
            translated: translatedPercent,
            fallback: fallbackPercent,
            missing: missingPercent,
          },
        )}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={translatedPercent}
      >
        <span
          data-kind="translated"
          data-empty={translated === 0 || undefined}
          style={{ width: `${translatedPercent}%` }}
        />
        <span
          data-kind="fallback"
          data-empty={fallback === 0 || undefined}
          style={{ width: `${fallbackPercent}%` }}
        />
        <span
          data-kind="missing"
          data-empty={missing === 0 || undefined}
          style={{ width: `${missingPercent}%` }}
        />
      </div>
      <div className={styles.progressLegend}>
        <span data-kind="translated">
          <i />
          <UiText text="已翻译" />
          <b>{translated}</b>
        </span>
        <span data-kind="fallback">
          <i />
          <UiText text="默认翻译" />
          <b>{fallback}</b>
        </span>
        <span data-kind="missing">
          <i />
          <UiText text="未翻译" />
          <b>{missing}</b>
        </span>
      </div>
    </div>
  );
}

function TranslationTable({
  rows,
  activeItem,
  compact = false,
  onOpen,
}: {
  rows: TranslationRow[];
  activeItem?: Pick<Item, "scope" | "key">;
  compact?: boolean;
  onOpen: (item: Item) => void;
}) {
  const t = useT();
  return (
    <div className={`${styles.list} ${compact ? styles.compactList : ""}`}>
      <div className={styles.columns} aria-hidden="true">
        <span>
          <UiText text="翻译键名" />
        </span>
        <span>
          <UiText text="原文" />
        </span>
        <span>
          <UiText text="译文" />
        </span>
      </div>
      <div className={styles.rows}>
        {rows.map(({ item, current, state }) => {
          const active =
            item.key === activeItem?.key && item.scope === activeItem.scope;
          return (
            <Button
              type="button"
              className={styles.rowButton}
              aria-label={t("编辑翻译：{key}", { key: item.key })}
              aria-current={active ? "true" : undefined}
              data-active={active || undefined}
              key={`${item.scope}:${item.key}`}
              onClick={() => onOpen(item)}
            >
              <span className={styles.keyCell} data-label={t("翻译键名")}>
                <code>{item.key}</code>
                <span className="admin-badge">{item.owner}</span>
              </span>
              <span className={styles.originalCell} data-label={t("原文")}>
                {item.source}
              </span>
              <span className={styles.translationCell} data-label={t("译文")}>
                <span
                  className={styles.translationValue}
                  data-empty={current ? undefined : true}
                >
                  {current || t("暂无译文")}
                </span>
                <small>
                  <Icon
                    name={
                      state === "custom"
                        ? "check"
                        : state === "fallback"
                          ? "chevron"
                          : "edit"
                    }
                  />
                  {state === "custom" ? (
                    <UiText text="已自定义" />
                  ) : state === "fallback" ? (
                    <UiText text="基础文本" />
                  ) : (
                    <UiText text="未翻译" />
                  )}
                </small>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function TranslationSettingsPage() {
  const t = useT();
  const languages = useLanguageCatalog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editable = can(useAdminAccount(), "settings:write");
  const editor = useTranslationSettings();
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [locale, setLocale] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const languageOptions = languages.languages
    .filter((item) => item.enabled)
    .map((item) => ({
      value: item.code,
      label: item.name,
      flag: item.flag,
    }));
  const selectedLocale =
    languageOptions.find((item) => item.value === locale)?.value ??
    languageOptions[0]?.value ??
    "zh-CN";
  const requestedDetailScope = parseScope(searchParams.get("scope"));
  const requestedDetailFilter = parseScopeFilter(searchParams.get("filter"));
  const requestedDetailLocale = searchParams.get("locale") ?? "";
  const requestedDetailKey = searchParams.get("key") ?? "";
  const detail =
    requestedDetailScope && requestedDetailLocale && requestedDetailKey
      ? {
          scope: requestedDetailScope,
          filter: requestedDetailFilter ?? requestedDetailScope,
          locale: requestedDetailLocale,
          key: requestedDetailKey,
        }
      : null;
  const viewScope = detail?.filter ?? scope;
  const viewLocale = detail?.locale ?? selectedLocale;
  const selectedLanguage = languages.languages.find(
    (item) => item.code === viewLocale,
  );
  const fallbackLocale =
    selectedLanguage?.ui_locale ??
    (viewLocale.toLowerCase().startsWith("en") ? "en" : "zh-CN");
  const allCatalog: Item[] = [
    ...frontendCatalog.map((item) => ({ ...item, scope: "public" as const })),
    ...frontendCatalog.map((item) => ({ ...item, scope: "admin" as const })),
    ...(editor.saved?.backend_catalog ?? []),
  ];
  const catalog = allCatalog.filter(
    (item) => viewScope === "all" || item.scope === viewScope,
  );
  const overrides = new Map(
    (editor.saved?.overrides ?? [])
      .filter((item) => item.locale === viewLocale)
      .map((item) => [identity(item.scope, viewLocale, item.key), item]),
  );
  const overrideFor = (item: Item) =>
    overrides.get(identity(item.scope, viewLocale, item.key));
  const defaultFor = (item: Item) =>
    item.defaults?.[viewLocale] ??
    item.defaults?.[fallbackLocale] ??
    item.defaults?.["zh-CN"] ??
    item.defaults?.en ??
    "";
  const progress = catalog.reduce(
    (counts, item) => {
      if (overrideFor(item)) counts.translated += 1;
      else if (defaultFor(item)) counts.fallback += 1;
      else counts.missing += 1;
      return counts;
    },
    { translated: 0, fallback: 0, missing: 0 },
  );
  const needle = search.normalize("NFKC").trim().toLocaleLowerCase();
  const filtered = catalog.filter((item) => {
    const override = overrideFor(item);
    const nativeDefault = item.defaults?.[viewLocale];
    const fallback = defaultFor(item);
    const matchesStatus =
      status === "all"
        ? true
        : status === "custom"
          ? Boolean(override)
          : status === "missing"
            ? !nativeDefault && !override
            : status === "fallback"
              ? !nativeDefault && Boolean(fallback)
              : Boolean(override && override.source !== item.source);
    if (!matchesStatus) return false;
    if (!needle) return true;
    return [item.key, item.source, nativeDefault, override?.value, item.owner]
      .filter((value): value is string => Boolean(value))
      .some((value) =>
        value.normalize("NFKC").toLocaleLowerCase().includes(needle),
      );
  });
  const pageSize = 40;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const draftFor = (item: Item) =>
    drafts[identity(item.scope, viewLocale, item.key)] ??
    overrideFor(item)?.value ??
    "";
  const translationRows: TranslationRow[] = rows.map((item) => {
    const fallback = defaultFor(item);
    return {
      item,
      current: draftFor(item).trim() || fallback,
      state: overrideFor(item) ? "custom" : fallback ? "fallback" : "missing",
    };
  });
  const setDraft = (item: Item, value: string) => {
    setValidationError("");
    setTransferError("");
    setDrafts((current) => ({
      ...current,
      [identity(item.scope, viewLocale, item.key)]: value,
    }));
  };
  const dirtyChanges = useMemo(() => {
    const changes: TranslationChange[] = [];
    for (const [id, value] of Object.entries(drafts)) {
      const [draftScope, draftLocale, ...parts] = id.split("\0");
      const key = parts.join("\0");
      const item = (
        draftScope === "backend"
          ? (editor.saved?.backend_catalog ?? [])
          : frontendCatalog
      ).find((entry) => entry.key === key);
      if (!item) continue;
      const previous =
        editor.saved?.overrides.find(
          (entry) =>
            entry.scope === draftScope &&
            entry.locale === draftLocale &&
            entry.key === key,
        )?.value ?? "";
      if (value.trim() !== previous) {
        changes.push({
          scope: draftScope as Scope,
          locale: draftLocale,
          key,
          source: item.source,
          value: value.trim() || null,
        });
      }
    }
    return changes;
  }, [drafts, editor.saved]);
  const resetDrafts = () => {
    setDrafts({});
    setTransferMessage("");
    setTransferError("");
  };
  const save = async () => {
    setTransferMessage("");
    for (const change of dirtyChanges) {
      if (
        change.value &&
        placeholderSignature(change.value) !==
          placeholderSignature(change.source)
      ) {
        setValidationError(
          t("“{source}”的占位符必须与原文一致。", {
            source: change.key,
          }),
        );
        return;
      }
    }
    setValidationError("");
    if (await editor.save(dirtyChanges)) setDrafts({});
  };
  const importTranslations = async (files: File[]) => {
    setTransferError("");
    setTransferMessage("");
    if (!editor.saved || !files.length) return;
    if (files.length !== 1) {
      setTransferError("一次只能导入一个 JSON 文件。");
      return;
    }
    const file = files[0];
    if (file.size > 8 * 1024 * 1024) {
      setTransferError("翻译文件不能超过 8 MB。");
      return;
    }
    try {
      const parsed = parseTranslationBundle(await file.text());
      const availableLocales = new Set([
        "zh-CN",
        "en",
        ...languageOptions.map((item) => item.value),
      ]);
      const sources = new Map(
        allCatalog.map((item) => [`${item.scope}\0${item.key}`, item.source]),
      );
      const imported: Record<string, string> = {};
      for (const entry of parsed.entries) {
        if (!availableLocales.has(entry.locale))
          throw new Error(`导入文件包含未启用的语言：${entry.locale}`);
        const source = sources.get(`${entry.scope}\0${entry.key}`);
        if (!source)
          throw new Error(`导入文件包含不存在的翻译键：${entry.key}`);
        const value = entry.value.trim();
        if (
          value &&
          placeholderSignature(value) !== placeholderSignature(source)
        )
          throw new Error(`翻译“${entry.key}”的占位符与原文不一致。`);
        imported[draftIdentity(entry.scope, entry.locale, entry.key)] = value;
      }
      setDrafts((current) => ({ ...current, ...imported }));
      setTransferMessage(
        t("已导入 {count} 项翻译，保存后生效。", {
          count: parsed.entries.length,
        }),
      );
    } catch (reason) {
      setTransferError(
        reason instanceof Error ? reason.message : "导入文件无效。",
      );
    }
  };
  const currentScope = scopeFilters.find((item) => item.value === viewScope)!;
  const currentLanguage = languageOptions.find(
    (item) => item.value === viewLocale,
  );
  const detailItem = detail
    ? catalog.find(
        (item) => item.scope === detail.scope && item.key === detail.key,
      )
    : undefined;
  const detailItemScope = detailItem
    ? scopes.find((item) => item.value === detailItem.scope)
    : undefined;
  const detailOverride = detailItem ? overrideFor(detailItem) : undefined;
  const detailFallback = detailItem ? defaultFor(detailItem) : "";
  const detailIndex = detailItem
    ? filtered.findIndex((item) => item.key === detailItem.key)
    : -1;
  const openDetail = (item: Item) => {
    const params = new URLSearchParams();
    params.set("scope", item.scope);
    params.set("filter", detail?.filter ?? scope);
    params.set("locale", detail?.locale ?? selectedLocale);
    params.set("key", item.key);
    router.push(`${pathname}?${params.toString()}`);
  };
  const openAdjacent = (offset: number) => {
    const nextItem = filtered[detailIndex + offset];
    if (!detail || !nextItem) return;
    const params = new URLSearchParams();
    params.set("scope", detail.scope);
    params.set("filter", detail.filter);
    params.set("locale", detail.locale);
    params.set("key", nextItem.key);
    router.push(`${pathname}?${params.toString()}`);
  };
  const closeDetail = () => router.replace(pathname);
  const transferActions = editor.saved ? (
    <div className={styles.transferActions}>
      <DownloadButton
        className="admin-button"
        filename={`everunfold-translations-${new Date()
          .toISOString()
          .slice(0, 10)}.json`}
        content={() =>
          serializeTranslationBundle(editor.saved?.overrides ?? [], drafts)
        }
      >
        <Icon name="download" />
        <UiText text="导出 JSON" />
      </DownloadButton>
      <FilePicker
        className="admin-button"
        label="导入 JSON"
        display={<UiText text="导入 JSON" />}
        accept=".json,application/json"
        disabled={!editable || editor.busy}
        onFiles={(files) => void importTranslations(files)}
      />
    </div>
  ) : null;
  return (
    <SettingsLayout fullWidth>
      <UnsavedAccountChanges
        dirty={dirtyChanges.length > 0}
        busy={editor.busy}
      />
      <AdminPageHeading
        title="翻译字符串"
        description="以只读内置语言包为基础，只为当前站点保存差异覆盖。"
      />
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset className="admin-settings-form" disabled={editor.busy}>
          {detail ? (
            <SettingsSection
              id="translation-detail"
              title="编辑翻译"
              description="检查原文和上下文，维护当前语言的译文。"
              action={
                <div className={styles.sectionActions}>
                  {transferActions}
                  <Button className="admin-button" onClick={closeDetail}>
                    <Icon name="arrow-left" />
                    <UiText text="返回列表" />
                  </Button>
                </div>
              }
            >
              {editor.loading ? (
                <p className={styles.empty} role="status">
                  <UiText text="正在读取翻译设置…" />
                </p>
              ) : !detailItem ? (
                <div className={styles.missingDetail}>
                  <p>
                    <UiText text="该翻译条目已不存在。" />
                  </p>
                  <Button className="admin-button" onClick={closeDetail}>
                    <UiText text="返回查看所有翻译字符串。" />
                  </Button>
                </div>
              ) : (
                <div className={styles.detail}>
                  <TranslationToolbar
                    scope={detail.filter}
                    locale={viewLocale}
                    status={status}
                    search={search}
                    languageOptions={languageOptions}
                    onScope={(value) => {
                      setScope(value);
                      setPage(0);
                      closeDetail();
                    }}
                    onLocale={(value) => {
                      setLocale(value);
                      setPage(0);
                      closeDetail();
                    }}
                    onStatus={(value) => {
                      setStatus(value);
                      setPage(0);
                      closeDetail();
                    }}
                    onSearch={(value) => {
                      setSearch(value);
                      setPage(0);
                    }}
                  />
                  <TranslationProgress
                    translated={progress.translated}
                    fallback={progress.fallback}
                    missing={progress.missing}
                  />
                  <TranslationTable
                    rows={translationRows}
                    activeItem={detailItem}
                    compact
                    onOpen={openDetail}
                  />
                  <div className={styles.detailGrid}>
                    <div className={styles.detailMain}>
                      <section
                        className={`${styles.detailPane} ${styles.sourcePane}`}
                      >
                        <div className={styles.paneHeading}>
                          <h3>
                            <UiText text="原文" />
                          </h3>
                          <span>{detailItem.owner}</span>
                        </div>
                        <div className={styles.codeEditorFrame}>
                          <CodeEditor
                            value={detailItem.source}
                            onChange={() => undefined}
                            label={t("原文")}
                            language={[]}
                            disabled
                          />
                        </div>
                      </section>
                      <section className={styles.detailPane}>
                        <div className={styles.paneHeading}>
                          <h3>
                            <UiText text="译文" />
                          </h3>
                          <span>
                            <UiText
                              text={currentLanguage?.label ?? viewLocale}
                            />
                          </span>
                        </div>
                        <div className={styles.codeEditorFrame}>
                          <CodeEditor
                            value={draftFor(detailItem)}
                            onChange={(value) => setDraft(detailItem, value)}
                            label={t("翻译：{source}", {
                              source: detailItem.source,
                            })}
                            language={[]}
                            disabled={!editable || editor.busy}
                          />
                        </div>
                        <small className={styles.translationHint}>
                          {detailOverride ? (
                            <UiText text="正在覆盖基础文本" />
                          ) : detailFallback ? (
                            <UiText text="当前使用基础文本" />
                          ) : (
                            <UiText text="当前没有可回退的基础文本" />
                          )}
                        </small>
                        <div className={styles.translationActions}>
                          <small>
                            <UiText text="留空并保存后恢复基础文本。" />
                          </small>
                        </div>
                      </section>
                    </div>
                    <aside className={styles.detailSidebar}>
                      <section className={styles.detailPane}>
                        <div className={styles.paneHeading}>
                          <h3>
                            <UiText text="上下文" />
                          </h3>
                        </div>
                        <p className={styles.contextText}>
                          <UiText text={detailItemScope?.hint ?? ""} />
                        </p>
                        <dl className={styles.metaList}>
                          <div>
                            <dt>
                              <UiText text="翻译范围" />
                            </dt>
                            <dd>
                              <UiText text={detailItemScope?.label ?? ""} />
                            </dd>
                          </div>
                          <div>
                            <dt>
                              <UiText text="翻译语言" />
                            </dt>
                            <dd>
                              {currentLanguage && (
                                <LanguageFlag value={currentLanguage.flag} />
                              )}
                              {currentLanguage?.label ?? viewLocale}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              <UiText text="所有者" />
                            </dt>
                            <dd>{detailItem.owner}</dd>
                          </div>
                          <div>
                            <dt>
                              <UiText text="翻译键名" />
                            </dt>
                            <dd>
                              <code>{detailItem.key}</code>
                            </dd>
                          </div>
                          <div>
                            <dt>
                              <UiText text="翻译状态" />
                            </dt>
                            <dd>
                              <span
                                className="admin-badge admin-status-badge"
                                data-tone={
                                  detailOverride ? "positive" : "neutral"
                                }
                              >
                                <Icon
                                  name={detailOverride ? "check" : "edit"}
                                />
                                {detailOverride ? (
                                  <UiText text="已自定义" />
                                ) : (
                                  <UiText text="基础文本" />
                                )}
                              </span>
                            </dd>
                          </div>
                        </dl>
                        <Button
                          className="admin-button metaActions"
                          disabled={!editable || !detailOverride}
                          onClick={() => setDraft(detailItem, "")}
                        >
                          <Icon name="refresh" />
                          <UiText text="还原默认值" />
                        </Button>
                      </section>
                    </aside>
                  </div>
                  <div className={styles.detailPager}>
                    <Button
                      className="admin-button"
                      disabled={detailIndex <= 0}
                      onClick={() => openAdjacent(-1)}
                    >
                      <Icon name="chevron-left" />
                      <UiText text="上一条" />
                    </Button>
                    <span>
                      {t("当前筛选内共 {count} 条", {
                        count: filtered.length,
                      })}
                    </span>
                    <Button
                      className="admin-button"
                      disabled={
                        detailIndex < 0 || detailIndex + 1 >= filtered.length
                      }
                      onClick={() => openAdjacent(1)}
                    >
                      <UiText text="下一条" />
                      <Icon name="chevron" />
                    </Button>
                  </div>
                </div>
              )}
            </SettingsSection>
          ) : (
            <SettingsSection
              id="translation-overrides"
              title="翻译覆盖"
              description="列表提供键名、原文和译文概览；点击一行进入详情编辑。"
              action={
                <div className={styles.sectionActions}>{transferActions}</div>
              }
            >
              <div className={styles.workspace}>
                <TranslationToolbar
                  scope={scope}
                  locale={selectedLocale}
                  status={status}
                  search={search}
                  languageOptions={languageOptions}
                  onScope={(value) => {
                    setScope(value);
                    setPage(0);
                  }}
                  onLocale={(value) => {
                    setLocale(value);
                    setPage(0);
                  }}
                  onStatus={(value) => {
                    setStatus(value);
                    setPage(0);
                  }}
                  onSearch={(value) => {
                    setSearch(value);
                    setPage(0);
                  }}
                />
                <TranslationProgress
                  translated={progress.translated}
                  fallback={progress.fallback}
                  missing={progress.missing}
                />
                <p className={styles.scopeHint}>
                  <UiText text={currentScope.hint} />
                  <span>
                    {filtered.length} / {catalog.length}
                  </span>
                </p>
                {editor.loading ? (
                  <p className={styles.empty} role="status">
                    <UiText text="正在读取翻译设置…" />
                  </p>
                ) : rows.length === 0 ? (
                  <p className={styles.empty}>
                    <UiText text="没有匹配的翻译字符串。" />
                  </p>
                ) : (
                  <TranslationTable
                    rows={translationRows}
                    onOpen={openDetail}
                  />
                )}
                <div className={styles.pagination}>
                  <Button
                    className="admin-button"
                    disabled={currentPage === 0}
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    <Icon name="chevron-left" />
                    <UiText text="上一页" />
                  </Button>
                  <span>
                    {currentPage + 1} / {pageCount}
                  </span>
                  <Button
                    className="admin-button"
                    disabled={currentPage + 1 >= pageCount}
                    onClick={() =>
                      setPage((value) => Math.min(pageCount - 1, value + 1))
                    }
                  >
                    <UiText text="下一页" />
                    <Icon name="chevron" />
                  </Button>
                </div>
              </div>
            </SettingsSection>
          )}
        </fieldset>
        {(editor.error || validationError || transferError) && (
          <div className="admin-settings-message is-error" role="alert">
            <span>
              {validationError ||
                (transferError ? t(transferError) : "") ||
                editor.error}
            </span>
            {editor.error && (
              <Button
                className="admin-button"
                onClick={() => void editor.reload()}
              >
                <UiText text="重新读取" />
              </Button>
            )}
          </div>
        )}
        {editor.message && (
          <p className="admin-settings-message" role="status">
            {editor.message}
          </p>
        )}
        {transferMessage && (
          <p className="admin-settings-message" role="status">
            {transferMessage}
          </p>
        )}
        <div className="admin-settings-savebar">
          <div>
            <span>
              {dirtyChanges.length
                ? t("有 {count} 项尚未保存", { count: dirtyChanges.length })
                : t("已读取翻译版本 {revision}", {
                    revision: editor.saved?.revision ?? "",
                  })}
            </span>
          </div>
          <div className="admin-settings-actions">
            <Button
              className="admin-button"
              disabled={!dirtyChanges.length || editor.busy}
              onClick={resetDrafts}
            >
              <UiText text="撤销修改" />
            </Button>
            <Button
              className="admin-button admin-button-primary"
              type="submit"
              disabled={!editable || !dirtyChanges.length || editor.busy}
            >
              <Icon name={editor.busy ? "refresh" : "save"} />
              <UiText text={editor.busy ? "正在保存" : "保存更改"} />
            </Button>
          </div>
        </div>
      </Form>
    </SettingsLayout>
  );
}
