"use client";
import { useMemo, useState } from "react";
import { useLocale, useT, UiText } from "@/core/i18n/provider";
import { defaultFlag } from "@/core/i18n/catalog";
import { flagChoices, searchText } from "@/core/i18n/choices";
import { Modal } from "../../components/ui/modal";
import { Button, TextField } from "../../components/ui/primitives";
import { LanguageFlag } from "../../components/language-flag";
import styles from "./language-pickers.module.css";

export function FlagPicker({
  code,
  value,
  onPick,
  onClose,
}: {
  code: string;
  value: string;
  onPick: (flag: string) => void;
  onClose: () => void;
}) {
  const { uiLocale } = useLocale(),
    t = useT();
  const choices = useMemo(() => flagChoices(uiLocale), [uiLocale]);
  const [query, setQuery] = useState(""),
    [tab, setTab] = useState("flags"),
    [custom, setCustom] = useState(value),
    [closing, setClosing] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const choose = (flag: string) => {
    setSelected(flag);
    setClosing(true);
  };
  const matches = choices.filter((item) =>
    item.search.includes(searchText(query)),
  );
  return (
    <Modal
      title="选择语言标志"
      className={styles.dialog}
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (selected !== null) onPick(selected);
        onClose();
      }}
    >
      <div className={styles.body}>
        <nav className={styles.tabs} aria-label={t("标志类型")}>
          <Button
            aria-pressed={tab === "flags"}
            onClick={() => setTab("flags")}
          >
            <UiText text="国旗" />
          </Button>
          <Button
            aria-pressed={tab === "custom"}
            onClick={() => setTab("custom")}
          >
            <UiText text="自定义标志" />
          </Button>
        </nav>
        {tab === "flags" ? (
          <>
            <TextField
              type="search"
              aria-label={t("搜索国旗")}
              placeholder={t("搜索国家、地区或代码")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
            <div className={styles.flags} aria-label={t("国旗列表")}>
              {matches.map((item) => (
                <Button
                  key={item.code}
                  title={item.label}
                  aria-label={`${item.label} (${item.code})`}
                  aria-pressed={item.emoji === value}
                  className={styles.flagChoice}
                  onClick={() => choose(item.emoji)}
                >
                  <LanguageFlag value={item.emoji} size="compact" />
                  <small>
                    {/^[A-Z]{2}$/.test(item.code) ? item.code : item.label}
                  </small>
                </Button>
              ))}
            </div>
            {!matches.length && (
              <p>
                <UiText text="没有找到国旗，请尝试国家名称或代码。" />
              </p>
            )}
          </>
        ) : (
          <div className={styles.customFlag}>
            <label>
              <span>
                <UiText text="自定义标志" />
              </span>
              <TextField
                aria-label={t("自定义标志")}
                value={custom}
                maxLength={16}
                onChange={(event) => setCustom(event.target.value)}
                autoFocus
              />
            </label>
            <p>
              <UiText text="可填写其他 emoji 或简短标志，留空使用默认国旗。" />
            </p>
            <LanguageFlag
              value={custom || defaultFlag(code)}
              size="large"
              className={styles.largePreview}
            />
            <Button
              className="admin-button admin-button-primary"
              onClick={() => choose(custom || defaultFlag(code))}
            >
              <UiText text="应用标志" />
            </Button>
          </div>
        )}
        <footer className={styles.footer}>
          <Button
            className="admin-button"
            onClick={() => choose(defaultFlag(code))}
          >
            <UiText text="恢复默认标志" />
          </Button>
          <Button className="admin-button" onClick={() => setClosing(true)}>
            <UiText text="取消" />
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
