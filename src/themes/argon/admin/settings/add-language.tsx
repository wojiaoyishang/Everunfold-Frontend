"use client";
import { useMemo, useState } from "react";
import { useLocale, useT, UiText } from "@/core/i18n/provider";
import type { Language } from "@/core/i18n/catalog";
import { defaultFlag } from "@/core/i18n/catalog";
import {
  presetLanguages,
  searchText,
  customLanguage,
} from "@/core/i18n/choices";
import { Modal } from "../../components/ui/modal";
import { Button, Form, TextField } from "../../components/ui/primitives";
import styles from "./language-pickers.module.css";

export function AddLanguage({
  existing,
  onAdd,
  onClose,
}: {
  existing: string[];
  onAdd: (language: Language) => void;
  onClose: () => void;
}) {
  const { uiLocale } = useLocale(),
    t = useT();
  const presets = useMemo(() => presetLanguages(uiLocale), [uiLocale]);
  const [tab, setTab] = useState("presets"),
    [query, setQuery] = useState(""),
    [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [prefix, setPrefix] = useState(""),
    [closing, setClosing] = useState(false),
    [selected, setSelected] = useState<Language | null>(null);
  const choose = (item: Language) => {
    setSelected(item);
    setClosing(true);
  };
  const duplicate = existing.some(
    (item) => item.toLowerCase() === code.toLowerCase(),
  );
  const valid =
    /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(code) &&
    code.length <= 32 &&
    name.trim() &&
    !duplicate;
  return (
    <Modal
      title="添加语言"
      className={styles.dialog}
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (selected) onAdd(selected);
        onClose();
      }}
    >
      <div className={styles.body}>
        <nav className={styles.tabs} aria-label={t("添加方式")}>
          <Button
            aria-pressed={tab === "presets"}
            onClick={() => setTab("presets")}
          >
            <UiText text="备选语言" />
          </Button>
          <Button
            aria-pressed={tab === "custom"}
            onClick={() => setTab("custom")}
          >
            <UiText text="自定义语言" />
          </Button>
        </nav>
        {tab === "presets" ? (
          <>
            <TextField
              type="search"
              aria-label={t("搜索备选语言")}
              placeholder={t("搜索语言名称或代码")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
            <div className={styles.presets}>
              {presets
                .filter((item) => item.search.includes(searchText(query)))
                .map((item) => {
                  const added = existing.some(
                    (code) => code.toLowerCase() === item.code.toLowerCase(),
                  );
                  return (
                    <Button
                      key={item.code}
                      className={styles.preset}
                      disabled={added}
                      onClick={() => choose(item)}
                    >
                      <span className={styles.emoji} aria-hidden="true">
                        {item.flag}
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {item.description} · {item.code}
                        </small>
                      </span>
                      <span className={styles.added}>
                        {added ? t("已添加") : "+"}
                      </span>
                    </Button>
                  );
                })}
            </div>
          </>
        ) : (
          <Form
            className={styles.customLanguage}
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (valid)
                choose(customLanguage(code, name, prefix || undefined));
            }}
          >
            <label>
              <span>
                <UiText text="语言代码" />
              </span>
              <TextField
                aria-label={t("新语言代码")}
                value={code}
                maxLength={32}
                placeholder="eo / fr-CA"
                onChange={(event) => setCode(event.target.value)}
                autoFocus
                required
              />
            </label>
            <label>
              <span>
                <UiText text="显示名称" />
              </span>
              <TextField
                aria-label={t("新语言名称")}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label>
              <span>
                <UiText text="路径前缀" />
              </span>
              <TextField
                aria-label={t("新语言前缀")}
                value={prefix}
                maxLength={33}
                placeholder={code ? "/" + code.toLowerCase() : "/eo"}
                onChange={(event) => setPrefix(event.target.value)}
              />
            </label>
            <p>
              <span className={styles.emoji} aria-hidden="true">
                {defaultFlag(code)}
              </span>{" "}
              <UiText text="添加后可点击标志修改，也可继续调整前缀与界面回退。" />
            </p>
            {duplicate && (
              <p role="alert">
                <UiText text="此语言已经添加。" />
              </p>
            )}
            <Button
              type="submit"
              className="admin-button admin-button-primary"
              disabled={!valid}
            >
              <UiText text="添加语言" />
            </Button>
          </Form>
        )}
        <footer className={styles.footer}>
          <Button className="admin-button" onClick={() => setClosing(true)}>
            <UiText text="取消" />
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
