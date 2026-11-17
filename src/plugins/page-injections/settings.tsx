import { useEffect, useId, useState } from "react";
import type { PageInjection, PageInjectionState } from "@everunfold/plugin-sdk";
import {
  AdminLoadingState,
  AdminSourceEditor,
  Button,
  ConfirmDialog,
  Icon,
  Select,
  Switch,
  TextField,
  UiText,
  randomUUID,
  readPageInjectionSettings,
  savePageInjectionSettings,
  useAdminRequest,
  useT,
  useToast,
} from "@everunfold/plugin-sdk/client";
import styles from "./settings.module.css";

const scopes = [
  { value: "all", label: "所有站点页面" },
  { value: "public", label: "所有前台页面" },
  { value: "admin", label: "所有后台页面" },
  { value: "account", label: "账号中心" },
  { value: "top-menu", label: "有顶部菜单的前台页面" },
] as const;
const types = [
  { value: "", label: "任意页面类型" },
  { value: "home", label: "首页" },
  { value: "article", label: "文章详情" },
  { value: "moment", label: "说说详情" },
  { value: "page", label: "独立页面" },
  { value: "archive", label: "归档与内容列表" },
  { value: "search", label: "搜索结果" },
  { value: "glossary", label: "术语页面" },
  { value: "admin", label: "后台工作台" },
  { value: "account", label: "账号中心" },
] as const;
const languages = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
} as const;
type Language = keyof typeof languages;
const codeTabs = Object.keys(languages) as Language[];

export function PageInjectionSettings() {
  const { baseUrl } = useAdminRequest();
  const [load, setLoad] = useState<number>(0);
  const [state, setState] = useState<PageInjectionState>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void readPageInjectionSettings(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setState(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [baseUrl, load]);
  if (!state)
    return failed ? (
      <section className={`admin-panel ${styles.panel}`}>
        <p role="alert">
          <UiText text="暂时无法读取页面代码规则。" />
        </p>
        <Button
          className="admin-button"
          onClick={() => {
            setFailed(false);
            setLoad((n) => n + 1);
          }}
        >
          <UiText text="重试" />
        </Button>
      </section>
    ) : (
      <AdminLoadingState label="正在载入页面代码规则…" />
    );
  return <RuleEditor initial={state} />;
}

function allowedTypes(scope: PageInjection["scope"]) {
  if (scope === "all") return types;
  if (scope === "admin" || scope === "account")
    return types.filter(({ value }) => !value || value === scope);
  return types.filter(({ value }) => value !== "admin" && value !== "account");
}

function RuleEditor({ initial }: { initial: PageInjectionState }) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const toast = useToast();
  const t = useT();
  const editorId = useId();
  const [saved, setSaved] = useState(initial);
  const [rules, setRules] = useState<PageInjection[]>(initial.rules ?? []);
  const [selection, setSelection] = useState(rules[0]?.id ?? "");
  const [language, setLanguage] = useState<Language>("html");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rule = rules.find((item) => item.id === selection) ?? rules[0];
  const dirty = JSON.stringify(saved.rules ?? []) !== JSON.stringify(rules);
  const invalid = rules.some(
    (item) =>
      !item.name.trim() ||
      (item.path &&
        (!item.path.startsWith("/") ||
          item.path.startsWith("//") ||
          /[?#\\\s]/.test(item.path) ||
          item.path.includes("***") ||
          item.path.split("*").length > 17)),
  );
  const large =
    new TextEncoder().encode(
      rules
        .flatMap((item) => codeTabs.map((lang) => item[lang] ?? ""))
        .join(""),
    ).length > 64000;
  const patch = (changes: Partial<PageInjection>) => {
    setRules((items) =>
      items.map((item) =>
        item.id === rule?.id ? { ...item, ...changes } : item,
      ),
    );
    setError("");
  };
  const add = () => {
    const id = randomUUID();
    setRules([
      ...rules,
      {
        id,
        name: t("新规则"),
        enabled: false,
        scope: "public",
        page_type: "",
        path: "",
        html: "",
        css: "",
        javascript: "",
      },
    ]);
    setSelection(id);
    setLanguage("html");
    setError("");
  };
  const save = async () => {
    if (!dirty || invalid || large) return false;
    setSaving(true);
    setError("");
    try {
      const response = await savePageInjectionSettings(
        baseUrl,
        { expected_revision: saved.revision ?? 0, rules },
        csrfToken,
      );
      setSaved(response.data);
      setRules(response.data.rules ?? []);
      toast.show({
        id: "page-injections-saved",
        title: "页面代码规则已保存",
        tone: "success",
      });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("保存失败"));
      return false;
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className={`admin-panel ${styles.panel}`}>
      <div className={styles.heading}>
        <p>
          <UiText text="按页面范围、类型和 URL 指定匹配规则。公开页的更改随站点设置同步。" />
        </p>
        <div className={styles.actions}>
          <Button
            className="admin-button"
            onClick={add}
            disabled={saving || rules.length >= 32}
          >
            <Icon name="plus" /> <UiText text="添加规则" />
          </Button>
          <Button
            className="admin-button admin-button-primary"
            onClick={() => {
              setError("");
              setConfirm(true);
            }}
            disabled={!dirty || invalid || large || saving}
          >
            <Icon name="save" /> <UiText text="保存规则" />
          </Button>
        </div>
      </div>
      {invalid && (
        <p role="status" className={styles.error}>
          <UiText text="请填写名称和有效的站内路径。" />
        </p>
      )}
      {large && (
        <p role="status" className={styles.error}>
          <UiText text="全部代码合计不能超过 64 KB。" />
        </p>
      )}
      {rule ? (
        <>
          <div className={styles.heading}>
            <Select
              name={editorId + "-rule"}
              label={t("选择规则")}
              value={rule.id}
              options={rules.map((item) => ({
                value: item.id,
                label: item.name || t("未命名规则"),
              }))}
              onValueChange={(value) => {
                setSelection(value);
                setLanguage("html");
              }}
            />
            <span className={styles.ruleState}>
              <UiText text="启用规则" />
              <Switch
                checked={rule.enabled}
                aria-label={t("启用规则")}
                disabled={saving}
                onCheckedChange={(enabled) => patch({ enabled })}
              />
              <Button
                className="admin-button"
                onClick={() =>
                  setRules(rules.filter((item) => item.id !== rule.id))
                }
                disabled={saving}
              >
                <UiText text="移除规则" />
              </Button>
            </span>
          </div>
          <div className={styles.fields}>
            <label>
              <UiText text="规则名称" />
              <TextField
                value={rule.name}
                maxLength={120}
                disabled={saving}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </label>
            <div className="admin-field">
              <UiText text="页面范围" />
              <Select
                label={t("页面范围")}
                name={editorId + "-scope"}
                options={[...scopes]}
                value={rule.scope}
                onValueChange={(value) => {
                  const scope = scopes.find(
                    (item) => item.value === value,
                  )?.value;
                  if (scope)
                    patch({
                      scope,
                      page_type: allowedTypes(scope).some(
                        (item) => item.value === rule.page_type,
                      )
                        ? rule.page_type
                        : "",
                    });
                }}
              />
            </div>
            <div className="admin-field">
              <UiText text="页面类型" />
              <Select
                label={t("页面类型")}
                name={editorId + "-type"}
                options={allowedTypes(rule.scope)}
                value={rule.page_type ?? ""}
                onValueChange={(value) => {
                  const page_type = types.find(
                    (item) => item.value === value,
                  )?.value;
                  if (page_type !== undefined) patch({ page_type });
                }}
              />
            </div>
            <label>
              <UiText text="URL 路径（可选）" />
              <TextField
                value={rule.path ?? ""}
                placeholder="/archives 或 /articles/**"
                maxLength={512}
                disabled={saving}
                onChange={(event) => patch({ path: event.target.value })}
              />
            </label>
          </div>
          <p className="admin-settings-hint">
            <UiText text="* 匹配一层路径，** 可跨层。全部已填写的条件须同时满足。" />
          </p>
          <div
            className={styles.codeTabs}
            role="group"
            aria-label={t("代码类型")}
          >
            {codeTabs.map((lang) => (
              <Button
                key={lang}
                className="admin-button"
                aria-pressed={lang === language}
                onClick={() => setLanguage(lang)}
              >
                {languages[lang]}
              </Button>
            ))}
          </div>
          <div className={styles.editor}>
            <AdminSourceEditor
              key={rule.id + language}
              kind={language}
              label={languages[language]}
              limit={16000}
              value={rule[language] ?? ""}
              disabled={saving}
              onChange={(value) => patch({ [language]: value })}
            />
          </div>
        </>
      ) : (
        <p>
          <UiText text="还没有规则。" />
        </p>
      )}
      <ConfirmDialog
        open={confirm}
        title="保存页面代码规则？"
        description="启用的代码会在匹配的站点页面上运行。请只保存你信任的代码，后台规则可影响已登录的操作。"
        intent="warning"
        confirmLabel="保存规则"
        busy={saving}
        error={error}
        onCancel={() => setConfirm(false)}
        onConfirm={save}
        onConfirmed={() => setConfirm(false)}
      />
    </section>
  );
}
