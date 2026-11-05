"use client";
import { useEffect, useRef, useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import type { LanguageCatalog, Language } from "@/core/i18n/catalog";
import { defaultFlag } from "@/core/i18n/catalog";
import {
  installedMessageLocales,
  messageNames,
  nativeMessageLocale,
} from "@/core/i18n/locale";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Icon } from "../../components/icon";
import { SettingsSection } from "./shared";
import styles from "./languages.module.css";
import { FlagPicker } from "./flag-picker";
import { AddLanguage } from "./add-language";

export function SettingsLanguages({
  value,
  onChange,
}: {
  value: LanguageCatalog;
  onChange: (value: LanguageCatalog) => void;
}) {
  const t = useT();
  const [flagIndex, setFlagIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const pickerTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (adding || flagIndex !== null) return;
    const trigger = pickerTrigger.current;
    pickerTrigger.current = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, [adding, flagIndex]);
  const update = (index: number, patch: Partial<Language>) => {
    const old = value.languages[index];
    const next = { ...old, ...patch };
    if (
      patch.code !== undefined &&
      (old.flag === defaultFlag(old.code) || !old.flag)
    )
      next.flag = defaultFlag(patch.code);
    const native = nativeMessageLocale(next.code);
    if (native) next.ui_locale = native;
    if (
      patch.code !== undefined &&
      old.prefix !== "" &&
      (!old.code || old.prefix === "/" + old.code.toLowerCase())
    )
      next.prefix = "/" + patch.code.toLowerCase();
    onChange({
      ...value,
      default_code:
        old.code === value.default_code ? next.code : value.default_code,
      languages: value.languages.map((item, i) => (i === index ? next : item)),
    });
  };
  const chooseDefault = (code: string) =>
    onChange({
      ...value,
      default_code: code,
      languages: value.languages.map((item) =>
        item.code === code
          ? { ...item, enabled: true }
          : item.prefix === ""
            ? { ...item, prefix: "/" + item.code.toLowerCase() }
            : item,
      ),
    });
  const codes = value.languages.map((item) => item.code.toLowerCase()),
    prefixes = value.languages.map((item) => item.prefix);
  const invalid =
    value.languages.some(
      (item) =>
        !item.name.trim() ||
        (!item.prefix && item.code !== value.default_code) ||
        !/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(item.code) ||
        !/^(?:|\/[a-z0-9][a-z0-9-]{0,31})$/.test(item.prefix),
    ) ||
    new Set(codes).size !== codes.length ||
    new Set(prefixes).size !== prefixes.length;
  return (
    <SettingsSection
      id="settings-languages"
      title="语言"
      description="管理文章、说说与前台入口使用的语言。新增语言后可独立创建和发布译文。"
    >
      <div className={styles.default}>
        <label id="default-language-label">
          <UiText text="默认语言" />
        </label>
        <Select
          name="default-content-language"
          label={t("默认语言")}
          value={value.default_code}
          options={value.languages
            .filter((item) => item.enabled)
            .map((item) => ({
              value: item.code,
              label: item.name || item.code || t("新语言"),
              flag: item.flag,
            }))}
          onValueChange={chooseDefault}
        />
      </div>
      <p className={styles.hint}>
        <UiText text="默认语言和前缀可独立修改，中文也可使用前缀。修改影响导航与新地址，已有文章地址保持；留空前缀仅供默认语言使用。" />
      </p>
      <div className={styles.rows}>
        {value.languages.map((item, index) => (
          <section
            className={styles.row}
            key={index}
            aria-label={`${t("语言")} ${index + 1}`}
          >
            <div className={styles.flagField}>
              <span>
                <UiText text="标志" />
              </span>
              <Button
                className={styles.flagButton}
                aria-label={`${t("选择语言标志")} ${index + 1}`}
                title={t("选择语言标志")}
                onClick={(event) => {
                  pickerTrigger.current = event.currentTarget;
                  setFlagIndex(index);
                }}
              >
                <span className={styles.emoji} aria-hidden="true">
                  {item.flag || defaultFlag(item.code)}
                </span>
              </Button>
            </div>
            <label className={styles.codeField}>
              <span>
                <UiText text="语言代码" />
              </span>
              <TextField
                aria-label={`${t("语言代码")} ${index + 1}`}
                placeholder="ja / fr-CA"
                maxLength={32}
                value={item.code}
                onChange={(event) =>
                  update(index, { code: event.target.value })
                }
              />
            </label>
            <label className={styles.nameField}>
              <span>
                <UiText text="显示名称" />
              </span>
              <TextField
                aria-label={`${t("显示名称")} ${index + 1}`}
                placeholder="日本語 / Français"
                maxLength={80}
                value={item.name}
                onChange={(event) =>
                  update(index, { name: event.target.value })
                }
              />
            </label>
            <label className={styles.prefixField}>
              <span>
                <UiText text="路径前缀" />
              </span>
              <TextField
                aria-label={`${t("路径前缀")} ${index + 1}`}
                placeholder={item.code === value.default_code ? "/" : "/ja"}
                value={item.prefix}
                maxLength={33}
                onChange={(event) =>
                  update(index, { prefix: event.target.value })
                }
              />
            </label>
            <div className={styles.interfaceField}>
              <span>
                <UiText text="界面语言包" />
              </span>
              {nativeMessageLocale(item.code) ? (
                <div className={styles.native}>
                  <Icon name="check" />
                  <UiText text="本语言界面" />
                  <small>{messageNames[nativeMessageLocale(item.code)!]}</small>
                </div>
              ) : (
                <>
                  <small>
                    <UiText text="暂无本语言界面，回退至" />
                  </small>
                  <Select
                    name={`language-ui-${index}`}
                    label={`${t("界面回退语言")} ${index + 1}`}
                    value={item.ui_locale}
                    options={installedMessageLocales.map((code) => ({
                      value: code,
                      label: messageNames[code],
                    }))}
                    onValueChange={(code) =>
                      update(index, {
                        ui_locale: code === "en" ? "en" : "zh-CN",
                      })
                    }
                  />
                </>
              )}
            </div>
            <div className={styles.actions}>
              <span>
                <UiText text="启用" />
              </span>
              <Switch
                aria-label={`${t("启用语言")} ${index + 1}`}
                checked={item.enabled}
                disabled={item.code === value.default_code}
                onCheckedChange={(enabled) => update(index, { enabled })}
              />
              <Button
                className="admin-icon-button"
                aria-label={`${t("移除语言")} ${index + 1}`}
                disabled={item.code === value.default_code}
                onClick={() =>
                  onChange({
                    ...value,
                    languages: value.languages.filter((_, i) => i !== index),
                  })
                }
              >
                <Icon name="trash" />
              </Button>
            </div>
          </section>
        ))}
      </div>
      {invalid && (
        <p className={styles.error} role="status">
          <UiText text="请填写有效的语言代码和名称；代码与路径前缀不能重复。" />
        </p>
      )}
      <Button
        className={`admin-button ${styles.add}`}
        onClick={(event) => {
          pickerTrigger.current = event.currentTarget;
          setAdding(true);
        }}
      >
        <Icon name="plus" />
        <UiText text="添加语言" />
      </Button>
      {flagIndex !== null && value.languages[flagIndex] && (
        <FlagPicker
          code={value.languages[flagIndex].code}
          value={value.languages[flagIndex].flag}
          onPick={(flag) => update(flagIndex, { flag })}
          onClose={() => setFlagIndex(null)}
        />
      )}
      {adding && (
        <AddLanguage
          existing={value.languages.map((item) => item.code)}
          onAdd={(language) =>
            onChange({ ...value, languages: [...value.languages, language] })
          }
          onClose={() => setAdding(false)}
        />
      )}
      <p className={styles.hint}>
        <UiText text="语言数量不设固定上限。内容语言与界面语言包分开；当前提供中文、英文界面，其他语言可选择回退界面。禁用只停止新增与全站入口，已有公开内容仍可访问。已有内容使用的语言不可直接删除。" />
      </p>
    </SettingsSection>
  );
}
