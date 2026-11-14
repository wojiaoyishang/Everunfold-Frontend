import { useEffect, useId, useState, type FormEvent } from "react";
import {
  Button,
  Form,
  Icon,
  Switch,
  TextField,
  randomUUID,
  useAdminRequest,
} from "@everunfold/plugin-sdk/client";
import { refreshAvailability } from "./availability";
import { readConfiguration, saveConfiguration, startTest } from "./client";
import type { Configuration } from "./contract";
import { writingScenes } from "./fields";
import { useGenerationJob } from "./generation-job";
import { jobError, requestError, useWritingText } from "./messages";
import styles from "./writing.module.css";

function origin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function WritingSettings({ pageId }: { pageId?: string }) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const t = useWritingText();
  const [configuration, setConfiguration] = useState<Configuration | null>(
    null,
  );
  const [unavailable, setUnavailable] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = () => {
    setUnavailable(false);
    setConfiguration(null);
    setRevision((value) => value + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    void readConfiguration({ baseUrl, csrfToken }, controller.signal)
      .then(setConfiguration)
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [baseUrl, csrfToken, revision]);

  if (configuration) {
    return (
      <ConfigurationForm
        value={configuration}
        reload={reload}
        page={Boolean(pageId)}
      />
    );
  }
  if (!unavailable) return <p role="status">{t("正在读取配置…")}</p>;
  return (
    <div className={styles.loadError}>
      <p role="alert">{t("配置暂时无法读取。")}</p>
      <Button className="admin-button" onClick={reload}>
        {t("重试")}
      </Button>
    </div>
  );
}

function ConfigurationForm({
  value,
  reload,
  page,
}: {
  value: Configuration;
  reload: () => void;
  page: boolean;
}) {
  const id = useId();
  const admin = useAdminRequest();
  const t = useWritingText();
  const test = useGenerationJob();
  const [saved, setSaved] = useState(value);
  const [draft, setDraft] = useState(value);
  const [key, setKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [testRevision, setTestRevision] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { enabled, base_url, model, fields, api_key_configured } = draft;
  const changingOrigin =
    api_key_configured && origin(base_url) !== origin(saved.base_url);
  const fieldsChanged = writingScenes.some(({ scene, fields: choices }) =>
    Object.keys(choices).some(
      (field) =>
        Boolean(fields[scene]?.includes(field)) !==
        Boolean(saved.fields[scene]?.includes(field)),
    ),
  );
  const dirty =
    enabled !== saved.enabled ||
    base_url.trim() !== saved.base_url ||
    model.trim() !== saved.model ||
    fieldsChanged ||
    Boolean(key || clearKey);
  const validProfile = Boolean(origin(base_url) && model.trim());

  const update = (patch: Partial<Configuration>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setNotice("");
    setError("");
  };

  const toggle = (scene: string, field: string, checked: boolean) => {
    setDraft((current) => {
      const selected = new Set(current.fields[scene] ?? []);
      if (checked) selected.add(field);
      else selected.delete(field);
      return {
        ...current,
        fields: { ...current.fields, [scene]: [...selected] },
      };
    });
    setNotice("");
    setError("");
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!dirty || saving || test.busy) return;
    setNotice("");
    setError("");
    if ((enabled || base_url || model || key) && !validProfile) {
      setError("请填写有效的接口地址和模型。");
      return;
    }
    if (changingOrigin && !key && !clearKey) {
      setError("更换接口来源后，请填写新密钥或移除现有密钥。");
      return;
    }
    setSaving(true);
    try {
      const next = await saveConfiguration(
        admin,
        {
          revision: saved.revision,
          enabled,
          base_url: base_url.trim(),
          model: model.trim(),
          fields,
          api_key: key || undefined,
          clear_api_key: clearKey || undefined,
        },
        AbortSignal.timeout(8000),
      );
      setSaved(next);
      setDraft(next);
      setKey("");
      setClearKey(false);
      setNotice("配置已保存");
      refreshAvailability(admin);
    } catch (cause) {
      setError(requestError(cause, true));
    } finally {
      setSaving(false);
    }
  }

  const testError = test.failure
    ? requestError(test.failure)
    : test.status && ["failed", "unknown"].includes(test.status.status)
      ? jobError(test.status.error)
      : "";
  const disabled = saving || test.busy;
  return (
    <Form
      className={`admin-density-controls ${styles.flow} ${page ? styles.settingsPage : ""}`}
      onSubmit={save}
    >
      <fieldset className={styles.form} disabled={disabled}>
        <div className={styles.connection}>
          <div className={styles.switchRow}>
            <label htmlFor={`${id}-enabled`}>{t("启用 AI 写作助手")}</label>
            <Switch
              id={`${id}-enabled`}
              checked={enabled}
              onCheckedChange={(next) => update({ enabled: next })}
            />
          </div>
          <label className={styles.field}>
            {t("接口地址")}
            <TextField
              type="url"
              value={base_url}
              maxLength={2048}
              placeholder="https://api.openai.com/v1"
              onChange={(event) => update({ base_url: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            {t("模型 ID")}
            <TextField
              value={model}
              maxLength={160}
              spellCheck={false}
              onChange={(event) => update({ model: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            API Key
            <TextField
              type="password"
              autoComplete="new-password"
              value={key}
              maxLength={4096}
              disabled={clearKey}
              placeholder={t(
                api_key_configured && !clearKey ? "保留现有密钥" : "可填写密钥",
              )}
              onChange={(event) => {
                setKey(event.target.value);
                setError("");
                setNotice("");
              }}
            />
          </label>
          {api_key_configured && (
            <div className={styles.switchRow}>
              <label htmlFor={`${id}-clear-key`}>{t("移除现有密钥")}</label>
              <Switch
                id={`${id}-clear-key`}
                checked={clearKey}
                onCheckedChange={(next) => {
                  setClearKey(next);
                  if (next) setKey("");
                  setNotice("");
                  setError("");
                }}
              />
            </div>
          )}
          {changingOrigin && !clearKey && !key && (
            <p className={styles.hint}>
              {t("更换接口来源后，请填写新密钥或移除现有密钥。")}
            </p>
          )}
        </div>
        <section
          className={styles.sceneSection}
          aria-labelledby={`${id}-fields`}
        >
          <h3 id={`${id}-fields`}>{t("生成入口")}</h3>
          <div className={styles.sceneGrid}>
            {writingScenes.map(({ scene, label, fields: choices }) => (
              <fieldset className={styles.scene} key={scene}>
                <legend>{t(label)}</legend>
                {Object.entries(choices).map(([field, title]) => (
                  <div className={styles.switchRow} key={field}>
                    <label htmlFor={`${id}-${scene}-${field}`}>
                      {t(title)}
                    </label>
                    <Switch
                      id={`${id}-${scene}-${field}`}
                      checked={Boolean(fields[scene]?.includes(field))}
                      onCheckedChange={(checked) =>
                        toggle(scene, field, checked)
                      }
                    />
                  </div>
                ))}
              </fieldset>
            ))}
          </div>
        </section>
      </fieldset>
      {error && (
        <div className={styles.loadError} role="alert">
          <p className={styles.error}>{t(error)}</p>
          {(error === "配置有更新。重新读取后再保存。" ||
            error === "连接中断。请重新读取配置后确认保存结果。") && (
            <Button className="admin-button" onClick={reload}>
              {t("重新读取配置")}
            </Button>
          )}
        </div>
      )}
      {testError && (
        <p className={styles.error} role="alert">
          {t(testError)}
        </p>
      )}
      <div className={styles.actions}>
        <div className={styles.notice} role="status">
          {notice && t(notice)}
          {test.busy &&
            t(test.status?.status === "queued" ? "正在排队…" : "正在测试…")}
          {!dirty &&
            testRevision === saved.revision &&
            !test.busy &&
            test.status?.status === "succeeded" &&
            t("测试通过")}
        </div>
        {Boolean(test.failure) && test.requestId && (
          <Button
            className="admin-button"
            disabled={disabled}
            onClick={() => void test.run(test.requestId)}
          >
            {t("查看结果")}
          </Button>
        )}
        <Button
          className="admin-button"
          disabled={dirty || disabled || !validProfile}
          onClick={() => {
            const request_id = randomUUID();
            setTestRevision(saved.revision);
            setNotice("");
            setError("");
            void test.run(request_id, (signal) =>
              startTest(admin, { request_id }, signal),
            );
          }}
        >
          <Icon name="plug" />
          {t("测试连接")}
        </Button>
        <Button
          type="submit"
          className="admin-button admin-button-primary"
          disabled={!dirty || disabled}
        >
          <Icon name="save" />
          {t(saving ? "正在保存…" : "保存更改")}
        </Button>
      </div>
    </Form>
  );
}
