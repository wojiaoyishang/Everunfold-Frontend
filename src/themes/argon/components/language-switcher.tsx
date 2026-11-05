"use client";
import { useLocale, useT } from "@/core/i18n/provider";
import {
  locales,
  localeNames,
  localizeHref,
  localeOf,
} from "@/core/i18n/locale";
import type { Content } from "@/core/content/types";
import { normalizePath } from "@/core/content/urls";
import { useRouteState } from "./route-state";
import { Icon } from "./icon";
import { ActionPopover } from "./ui/action-popover";
import { Button, TextLink } from "./ui/primitives";
import { useToast } from "./ui/toast/toast-provider";
import styles from "./languages.module.css";

export function InterfaceLanguage({
  className = "admin-icon-button",
}: {
  className?: string;
}) {
  const { locale, change } = useLocale();
  const t = useT();
  return (
    <ActionPopover
      label={t("界面语言")}
      className={className}
      panelClassName={styles.menu}
      triggerContent={<Icon name="languages" />}
    >
      {(close) => (
        <>
          {locales.map((value) => (
            <Button
              key={value}
              lang={value}
              aria-pressed={locale === value}
              onClick={() => {
                change(value);
                close();
              }}
            >
              {localeNames[value]}
              {locale === value && <Icon name="check" />}
            </Button>
          ))}
        </>
      )}
    </ActionPopover>
  );
}
export function PublicLanguage() {
  const { site, route } = useRouteState();
  const { locale, change } = useLocale();
  const t = useT();
  const toast = useToast();
  const path = normalizePath(route.split("?")[0]);
  const variants = site.contentTranslations?.[path];
  return (
    <ActionPopover
      label={t("语言")}
      className="icon-button"
      panelClassName={styles.menu}
      triggerContent={<Icon name="languages" />}
    >
      {(close) => (
        <>
          {locales.map((value) => {
            const target = variants?.find((item) => item.language === value);
            const href = variants ? target?.path : localizeHref(route, value);
            const body = (
              <>
                {localeNames[value]}
                {value === locale && <Icon name="check" />}
              </>
            );
            return href ? (
              <TextLink
                key={value}
                href={href}
                lang={value}
                hrefLang={value}
                aria-current={locale === value ? "page" : undefined}
                onClick={() => {
                  change(value);
                  close();
                }}
              >
                {body}
              </TextLink>
            ) : (
              <Button
                key={value}
                lang={value}
                onClick={() => {
                  change(value);
                  close();
                  toast.show({
                    id: "translation-missing",
                    title: t("这篇内容尚无此语言的已发布译文。"),
                    tone: "info",
                  });
                }}
              >
                {body}
                <small>{t("暂无译文")}</small>
              </Button>
            );
          })}
        </>
      )}
    </ActionPopover>
  );
}
export function ContentLanguages({
  content,
}: {
  content: Pick<Content, "id" | "language" | "translations">;
}) {
  const { change } = useLocale();
  const variants = content.translations ?? [];
  if (variants.length < 2) return null;
  return (
    <nav className={styles.versions} aria-label="Language versions">
      {variants.map((item) => (
        <TextLink
          key={item.id}
          href={item.path}
          hrefLang={item.language}
          lang={item.language}
          onClick={() => change(localeOf(item.language))}
          aria-current={item.id === content.id ? "page" : undefined}
        >
          {localeNames[localeOf(item.language)]}
          {item.access !== "public" && <Icon name="lock" />}
        </TextLink>
      ))}
    </nav>
  );
}
