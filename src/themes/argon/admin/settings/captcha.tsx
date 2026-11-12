"use client";
import { useId, type ReactNode } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { useCaptchaSettings } from "@/core/captcha/use-settings";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount } from "@/core/admin/account-context";
import {
  Button,
  Form,
  TextArea,
  TextField,
} from "../../components/ui/primitives";
import { PasswordField } from "../../components/ui/password-field";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
import { SettingsSection, SettingsToggle } from "./shared";
import { UnsavedAccountChanges } from "../../account/unsaved";
import styles from "./captcha.module.css";

const contentTypes = [
  { key: "article", label: "文章" },
  { key: "shuoshuo", label: "说说" },
  { key: "page", label: "页面" },
] as const;
export function CaptchaSettingsPanel({ trailing }: { trailing?: ReactNode }) {
  const t = useT();
  const editor = useCaptchaSettings();
  const editable = can(useAdminAccount(), "settings:write");
  const id = useId();
  const { draft, saved } = editor;
  const provider = draft?.provider ?? "local";
  const selected = draft?.providers[provider] ?? {
    site_key: "",
    hostnames: [],
  };
  const updateProvider = (patch: Partial<typeof selected>) =>
    editor.setDraft((current) =>
      current
        ? {
            ...current,
            providers: {
              ...current.providers,
              [provider]: { ...selected, ...patch },
            },
          }
        : current,
    );
  return (
    <>
      <UnsavedAccountChanges dirty={editor.dirty} busy={editor.busy} />
      {editor.loading ? (
        <>
          <p role="status">
            <UiText text="正在读取设置…" />
          </p>
          {trailing}
        </>
      ) : (
        draft &&
        saved && (
          <Form
            onSubmit={(event) => {
              event.preventDefault();
              void editor.save();
            }}
          >
            <fieldset
              className="admin-settings-form"
              disabled={editor.busy || !editable}
            >
              <SettingsSection
                id="captcha-provider"
                title="验证方式"
                description="未配置第三方服务时使用本地图片验证码。外部服务故障时会提示重试，不自动放行。"
                group="验证码"
              >
                <div className="admin-settings-field">
                  <label htmlFor={`${id}-provider`}>
                    <UiText text="验证码提供方" />
                  </label>
                  <Select
                    programOptions
                    name="captcha-provider"
                    label="验证码提供方"
                    value={provider}
                    options={saved.catalog.map((item) => ({
                      value: item.id,
                      label: item.title,
                    }))}
                    onValueChange={(provider) =>
                      editor.setDraft({ ...draft, provider })
                    }
                  />
                </div>
                {provider === "local" ? (
                  <p className={styles.hint}>
                    <UiText text="由本站生成 5 位图片验证码，无需申请密钥。验证码短时有效，使用一次后须刷新。" />
                  </p>
                ) : (
                  <>
                    <div className={styles.keys}>
                      <div className="admin-settings-field">
                        <label htmlFor={`${id}-site`}>Site Key</label>
                        <TextField
                          id={`${id}-site`}
                          value={selected.site_key ?? ""}
                          maxLength={300}
                          autoComplete="off"
                          onChange={(event) =>
                            updateProvider({ site_key: event.target.value })
                          }
                        />
                      </div>
                      <div className="admin-settings-field">
                        <label htmlFor={`${id}-secret`}>Secret</label>
                        <PasswordField
                          id={`${id}-secret`}
                          value={selected.secret ?? ""}
                          maxLength={2048}
                          autoComplete="new-password"
                          placeholder={t(
                            saved.providers[provider]?.secret_configured
                              ? "已配置，留空保留原密钥"
                              : "输入服务端密钥",
                          )}
                          onChange={(event) =>
                            updateProvider({
                              secret: event.target.value,
                              clear_secret: false,
                            })
                          }
                        />
                        <small>
                          <UiText text="密钥只保存在后端，不会回显给浏览器。" />
                        </small>
                      </div>
                    </div>
                    <div className="admin-settings-field">
                      <label htmlFor={`${id}-hosts`}>
                        <UiText text="允许的主机名" />
                      </label>
                      <TextArea
                        id={`${id}-hosts`}
                        rows={3}
                        value={(selected.hostnames ?? []).join("\n")}
                        onChange={(event) =>
                          updateProvider({
                            hostnames: event.target.value.split("\n"),
                          })
                        }
                        placeholder={"example.com\nlocalhost"}
                      />
                      <small>
                        <UiText text="每行一个主机名，不含协议、端口或通配符。后端会核对第三方返回的主机名。" />
                      </small>
                    </div>
                  </>
                )}
              </SettingsSection>
              {(["read", "comment"] as const).map((action) => (
                <SettingsSection
                  key={action}
                  id={`captcha-${action}`}
                  title={action === "read" ? "阅读验证" : "评论验证"}
                  group="验证码"
                  description={
                    action === "read"
                      ? "验证码通过后才返回正文。文章、说说和页面可在各自编辑器中覆盖全局规则。"
                      : "验证码通过后仍遵守评论开关和审核规则，不会直接公开留言。"
                  }
                >
                  {contentTypes.map((type) => (
                    <SettingsToggle
                      key={type.key}
                      label={`${type.label}${action === "read" ? "阅读" : "评论"}需要验证码`}
                      hint="单篇设置为“跟随全局”时使用此规则。"
                      value={draft.rules[action]?.[type.key] ?? false}
                      onChange={(enabled) =>
                        editor.setDraft({
                          ...draft,
                          rules: {
                            ...draft.rules,
                            [action]: {
                              ...draft.rules[action],
                              [type.key]: enabled,
                            },
                          },
                        })
                      }
                    />
                  ))}
                </SettingsSection>
              ))}
              <SettingsSection
                id="captcha-api-keys"
                title="API Key 请求"
                description="机器调用使用 Key 的权限、有效期和请求频率控制。Key 无效或已撤销时直接拒绝，不降级为匿名访问。"
                group="验证码"
              >
                <SettingsToggle
                  label="允许明确授权的 Key 免验证码"
                  hint="仅对授予“阅读免验证码”或“评论免验证码”的 Key 生效。已有 Key 不自动获得授权，登录和文章密码仍独立校验。"
                  value={draft.api_key_bypass ?? true}
                  onChange={(api_key_bypass) =>
                    editor.setDraft({ ...draft, api_key_bypass })
                  }
                />
                <div className="admin-settings-field">
                  <label htmlFor={`${id}-key-limit`}>
                    <UiText text="每个 Key 每分钟最多请求" />
                  </label>
                  <TextField
                    id={`${id}-key-limit`}
                    type="number"
                    min={1}
                    max={1000}
                    step={1}
                    required
                    value={draft.api_key_rate_limit ?? 60}
                    onChange={(event) =>
                      editor.setDraft({
                        ...draft,
                        api_key_rate_limit: Number(event.target.value),
                      })
                    }
                  />
                  <small>
                    <UiText text="阅读解锁、评论提交和验证码请求共用此额度；达到上限返回 429，不影响其他 Key。" />
                  </small>
                </div>
              </SettingsSection>
            </fieldset>
            {trailing}
            <div className="admin-settings-savebar">
              <div>
                <UiText
                  text={editor.dirty ? "有尚未保存的修改" : "设置已读取"}
                />
                {editor.message && (
                  <p role="status">
                    <UiText text={editor.message} />
                  </p>
                )}
              </div>
              <div className="admin-settings-actions">
                <Button
                  className="admin-button"
                  disabled={editor.busy || !editor.dirty}
                  onClick={editor.reset}
                >
                  <UiText text="撤销修改" />
                </Button>
                <Button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={!editable || editor.busy || !editor.dirty}
                >
                  <Icon name={editor.busy ? "refresh" : "save"} />
                  <UiText text={editor.busy ? "正在保存" : "保存更改"} />
                </Button>
              </div>
            </div>
          </Form>
        )
      )}
      {!editor.loading && (!draft || !saved) && trailing}
      {editor.error && (
        <div className="admin-settings-message is-error" role="alert">
          <UiText text={editor.error} />
          <Button className="admin-button" onClick={() => void editor.reload()}>
            <UiText text="重新读取" />
          </Button>
        </div>
      )}
    </>
  );
}
