import { useEffect, useId, useState, type FormEvent } from "react";
import {
  Button,
  ConfirmDialog,
  Form,
  Icon,
  Select,
  SettingsLayout,
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

const providerLimit = 20;
type Provider = Configuration["providers"][number];
type ProviderDraft = Provider & { key: string; clearKey: boolean };
type ConfigurationDraft = Omit<Configuration, "providers"> & {
  providers: ProviderDraft[];
};

function createDraft(saved: Configuration): ConfigurationDraft {
  return {
    ...saved,
    providers: saved.providers.map((provider) => ({
      ...provider,
      key: "",
      clearKey: false,
    })),
  };
}

function endpoint(value: string) {
  try {
    const url = new URL(value);
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.port !== "0" &&
      !/[\s\\]/.test(value)
    )
      return url;
  } catch {
    return null;
  }
  return null;
}

function connectionUnchanged(provider: ProviderDraft, previous?: Provider) {
  return (
    previous &&
    provider.base_url.trim() === previous.base_url &&
    provider.model.trim() === previous.model &&
    !provider.key &&
    !provider.clearKey
  );
}

function changedOrigin(provider: ProviderDraft, previous?: Provider) {
  return Boolean(
    previous?.api_key_configured &&
    endpoint(provider.base_url.trim())?.origin !==
      endpoint(previous.base_url)?.origin,
  );
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
      .then((next) => {
        if (!controller.signal.aborted) setConfiguration(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [baseUrl, csrfToken, revision]);

  if (!configuration) {
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
  const form = (
    <ConfigurationForm value={configuration} reload={reload} page={!!pageId} />
  );
  return pageId ? <SettingsLayout>{form}</SettingsLayout> : form;
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
  const [draft, setDraft] = useState(() => createDraft(value));
  const [selectedId, setSelectedId] = useState(value.default_provider_id);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [testing, setTesting] = useState<{
    providerId: string;
    revision: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { enabled, fields, providers, default_provider_id } = draft;
  const selected = providers.find((provider) => provider.id === selectedId);
  const savedProvider = (providerId: string) =>
    saved.providers.find((provider) => provider.id === providerId);
  const testable = Boolean(
    selected &&
    endpoint(selected.base_url.trim()) &&
    selected.model.trim() &&
    connectionUnchanged(selected, savedProvider(selected.id)),
  );
  const showTest =
    testable &&
    testing?.providerId === selected?.id &&
    testing?.revision === saved.revision;
  const dirty =
    enabled !== saved.enabled ||
    default_provider_id !== saved.default_provider_id ||
    providers.length !== saved.providers.length ||
    providers.some((provider) => {
      const previous = savedProvider(provider.id);
      return (
        !connectionUnchanged(provider, previous) ||
        provider.name.trim() !== previous?.name
      );
    }) ||
    writingScenes.some(({ scene, fields: choices }) =>
      Object.keys(choices).some(
        (field) =>
          Boolean(fields[scene]?.includes(field)) !==
          Boolean(saved.fields[scene]?.includes(field)),
      ),
    );

  function clearFeedback() {
    setNotice("");
    setError("");
  }

  function update(patch: Partial<ConfigurationDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    clearFeedback();
  }

  function addProvider() {
    if (providers.length >= providerLimit) return;
    const providerId = randomUUID();
    update({
      providers: [
        ...providers,
        {
          id: providerId,
          name: "",
          base_url: "",
          model: "",
          api_key_configured: false,
          key: "",
          clearKey: false,
        },
      ],
      default_provider_id: default_provider_id ?? providerId,
    });
    setSelectedId(providerId);
  }

  function updateProvider(providerId: string, patch: Partial<ProviderDraft>) {
    setDraft((current) => ({
      ...current,
      providers: current.providers.map((provider) =>
        provider.id === providerId ? { ...provider, ...patch } : provider,
      ),
    }));
    clearFeedback();
  }

  function removeProvider(providerId: string) {
    const remaining = providers.filter(
      (provider) => provider.id !== providerId,
    );
    const defaultId = remaining.some(
      (provider) => provider.id === default_provider_id,
    )
      ? default_provider_id
      : (remaining[0]?.id ?? null);
    update({
      providers: remaining,
      default_provider_id: defaultId,
      enabled: enabled && remaining.length > 0,
    });
    setSelectedId(defaultId);
    setRemoveId(null);
  }

  function toggle(scene: string, field: string, checked: boolean) {
    setDraft((current) => {
      const checkedFields = new Set(current.fields[scene] ?? []);
      if (checked) checkedFields.add(field);
      else checkedFields.delete(field);
      return {
        ...current,
        fields: { ...current.fields, [scene]: [...checkedFields] },
      };
    });
    clearFeedback();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!dirty || saving || test.busy) return;
    clearFeedback();
    if (enabled && !providers.length) {
      setError("启用写作助手前，请至少配置一个服务商。");
      return;
    }
    const names = new Set<string>();
    for (const provider of providers) {
      const name = provider.name.trim().toLowerCase();
      const address = endpoint(provider.base_url.trim());
      const previous = savedProvider(provider.id);
      const retainsKey = previous?.api_key_configured && !provider.clearKey;
      let problem = "";
      if (!name || !address || !provider.model.trim())
        problem = "请填写服务商名称、有效的接口地址和模型。";
      else if (names.has(name)) problem = "服务商名称不能重复。";
      else if (retainsKey && changedOrigin(provider, previous) && !provider.key)
        problem = "更换接口来源后，请填写新密钥或移除现有密钥。";
      else if ((provider.key || retainsKey) && address.protocol !== "https:")
        problem = "使用 API Key 时，接口地址必须为 HTTPS。";
      if (problem) {
        setSelectedId(provider.id);
        setError(problem);
        return;
      }
      names.add(name);
    }
    setSaving(true);
    try {
      const next = await saveConfiguration(
        admin,
        {
          revision: saved.revision,
          enabled,
          fields,
          default_provider_id,
          providers: providers.map((provider) => ({
            id: provider.id,
            name: provider.name.trim(),
            base_url: provider.base_url.trim(),
            model: provider.model.trim(),
            api_key: provider.key || undefined,
            clear_api_key: provider.clearKey || undefined,
          })),
        },
        AbortSignal.timeout(8000),
      );
      setSaved(next);
      setDraft(createDraft(next));
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
  const generalSection = page ? "ai-writing-general" : `${id}-general`;
  const providerSection = page ? "ai-writing-providers" : `${id}-providers`;
  const fieldSection = page ? "ai-writing-fields" : `${id}-fields`;
  return (
    <Form
      className={`admin-density-controls ${styles.flow} ${page ? styles.settingsPage : ""}`}
      noValidate
      onSubmit={save}
    >
      <fieldset className={styles.form} disabled={disabled}>
        <section
          id={generalSection}
          className={styles.settingsSection}
          data-settings-section="通用"
          tabIndex={page ? -1 : undefined}
          aria-label={t("通用")}
        >
          <div className={styles.switchRow}>
            <label htmlFor={`${id}-enabled`}>{t("启用 AI 写作助手")}</label>
            <Switch
              id={`${id}-enabled`}
              checked={enabled}
              onCheckedChange={(next) => update({ enabled: next })}
            />
          </div>
        </section>
        <section
          id={providerSection}
          className={styles.settingsSection}
          data-settings-section="模型服务商"
          tabIndex={page ? -1 : undefined}
          aria-labelledby={`${id}-providers-heading`}
        >
          <div className={styles.settingsHeading}>
            <h2 id={`${id}-providers-heading`}>{t("模型服务商")}</h2>
            <Button
              className="admin-button"
              disabled={providers.length >= providerLimit}
              onClick={addProvider}
            >
              <Icon name="plus" />
              {t("添加服务商")}
            </Button>
          </div>
          {selected ? (
            <>
              <div className={styles.providerToolbar}>
                <Select
                  name="editing_provider"
                  label={t("编辑服务商")}
                  disabled={disabled}
                  value={selected.id}
                  onValueChange={setSelectedId}
                  options={providers.map((provider) => ({
                    value: provider.id,
                    label: provider.name.trim() || t("未命名服务商"),
                  }))}
                />
                {selected.id === default_provider_id ? (
                  <span className={styles.defaultProvider}>
                    <Icon name="check" />
                    {t("默认服务商")}
                  </span>
                ) : (
                  <Button
                    className="admin-button"
                    onClick={() => update({ default_provider_id: selected.id })}
                  >
                    {t("设为默认")}
                  </Button>
                )}
              </div>
              <ProviderFields
                key={selected.id}
                selected={selected}
                showOriginWarning={
                  changedOrigin(selected, savedProvider(selected.id)) &&
                  !selected.clearKey &&
                  !selected.key
                }
                onChange={(patch) => updateProvider(selected.id, patch)}
              />
              <div className={styles.providerActions}>
                <Button
                  className="admin-button"
                  disabled={!testable || disabled}
                  onClick={() => {
                    const request_id = randomUUID();
                    const provider_id = selected.id;
                    setTesting({
                      providerId: provider_id,
                      revision: saved.revision,
                    });
                    clearFeedback();
                    void test.run(request_id, (signal) =>
                      startTest(
                        admin,
                        {
                          request_id,
                          provider_id,
                          expected_revision: saved.revision,
                        },
                        signal,
                      ),
                    );
                  }}
                >
                  <Icon name="plug" />
                  {t("测试连接")}
                </Button>
                <div className={styles.providerFeedback} role="status">
                  {!testable && t("保存更改后即可测试连接。")}
                  {showTest &&
                    test.busy &&
                    t(
                      test.status?.status === "queued"
                        ? "正在排队…"
                        : "正在测试…",
                    )}
                  {showTest &&
                    !test.busy &&
                    test.status?.status === "succeeded" && (
                      <span className={styles.providerSuccess}>
                        <Icon name="check" />
                        {t("测试通过")}
                      </span>
                    )}
                  {showTest && testError && (
                    <span className={styles.error}>{t(testError)}</span>
                  )}
                </div>
                {showTest && Boolean(test.failure) && test.requestId && (
                  <Button
                    className="admin-button"
                    disabled={disabled}
                    onClick={() => void test.run(test.requestId)}
                  >
                    {t("查看结果")}
                  </Button>
                )}
                <Button
                  className={`admin-button ${styles.removeProvider}`}
                  onClick={() => setRemoveId(selected.id)}
                >
                  <Icon name="trash" />
                  {t("删除服务商")}
                </Button>
              </div>
            </>
          ) : (
            <p className={styles.hint}>{t("未配置服务商。")}</p>
          )}
        </section>
        <section
          id={fieldSection}
          className={styles.settingsSection}
          data-settings-section="生成入口"
          tabIndex={page ? -1 : undefined}
          aria-labelledby={`${id}-fields-heading`}
        >
          <h2 id={`${id}-fields-heading`}>{t("生成入口")}</h2>
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
                      className={styles.sceneSwitch}
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
      <div className={styles.actions}>
        {error && (
          <div className={styles.saveError} role="alert">
            <p className={styles.error}>{t(error)}</p>
            {(error === "配置有更新。重新读取后再保存。" ||
              error === "连接中断。请重新读取配置后确认保存结果。") && (
              <Button className="admin-button" onClick={reload}>
                {t("重新读取配置")}
              </Button>
            )}
          </div>
        )}
        <div className={styles.notice} role="status">
          {notice && t(notice)}
        </div>
        <Button
          type="submit"
          className="admin-button admin-button-primary"
          disabled={!dirty || disabled}
        >
          <Icon name="save" />
          {t(saving ? "正在保存…" : "保存更改")}
        </Button>
      </div>
      {removeId && (
        <ConfirmDialog
          open
          title={t("删除服务商")}
          description={t(
            providers.length === 1 && enabled
              ? "保存后将移除此服务商，并停用 AI 写作助手。"
              : "保存后，此服务商将从生成选项中移除。",
          )}
          intent="danger"
          icon="trash"
          confirmIcon="trash"
          confirmLabel={t("删除服务商")}
          onCancel={() => setRemoveId(null)}
          onConfirm={() => true}
          onConfirmed={() => removeProvider(removeId)}
        />
      )}
    </Form>
  );
}

function ProviderFields({
  selected,
  showOriginWarning,
  onChange,
}: {
  selected: ProviderDraft;
  showOriginWarning: boolean;
  onChange: (patch: Partial<ProviderDraft>) => void;
}) {
  const id = useId();
  const t = useWritingText();
  return (
    <div className={styles.connection}>
      <label className={styles.field}>
        {t("服务商名称")}
        <TextField
          value={selected.name}
          maxLength={80}
          required
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <label className={styles.field}>
        {t("模型 ID")}
        <TextField
          value={selected.model}
          maxLength={160}
          required
          spellCheck={false}
          onChange={(event) => onChange({ model: event.target.value })}
        />
      </label>
      <label className={`${styles.field} ${styles.connectionWide}`}>
        {t("接口地址")}
        <TextField
          type="url"
          value={selected.base_url}
          maxLength={2048}
          required
          placeholder="https://api.openai.com/v1"
          onChange={(event) => onChange({ base_url: event.target.value })}
        />
      </label>
      <label className={`${styles.field} ${styles.connectionWide}`}>
        API Key
        <TextField
          type="password"
          autoComplete="new-password"
          value={selected.key}
          maxLength={4096}
          disabled={selected.clearKey}
          placeholder={t(
            selected.api_key_configured && !selected.clearKey
              ? "保留现有密钥"
              : "可填写密钥",
          )}
          onChange={(event) => onChange({ key: event.target.value })}
        />
      </label>
      {selected.api_key_configured && (
        <div className={`${styles.switchRow} ${styles.connectionWide}`}>
          <label htmlFor={`${id}-clear-key`}>{t("移除现有密钥")}</label>
          <Switch
            id={`${id}-clear-key`}
            checked={selected.clearKey}
            onCheckedChange={(next) =>
              onChange(next ? { clearKey: next, key: "" } : { clearKey: next })
            }
          />
        </div>
      )}
      {showOriginWarning && (
        <p className={`${styles.hint} ${styles.connectionWide}`}>
          {t("更换接口来源后，请填写新密钥或移除现有密钥。")}
        </p>
      )}
    </div>
  );
}
