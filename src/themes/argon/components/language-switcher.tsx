"use client";
import {
  useLocale,
  useRegisteredPageLocale,
  useT,
  useLanguageCatalog,
} from "@/core/i18n/provider";
import { localizeHref } from "@/core/i18n/locale";

import { normalizePath } from "@/core/content/urls";
import { useRouteState } from "./route-state";
import { Icon } from "./icon";
import { ActionPopover } from "./ui/action-popover";
import { Button, TextLink } from "./ui/primitives";
import { useToast } from "./ui/toast/toast-provider";
import styles from "./languages.module.css";
import { LanguageLabel } from "./language-label";

export function InterfaceLanguage({
  className = "admin-icon-button",
}: {
  className?: string;
}) {
  const { locale, change } = useLocale(),
    catalog = useLanguageCatalog(),
    t = useT();
  return (
    <ActionPopover
      label={t("界面语言")}
      className={className}
      panelClassName={styles.menu}
      triggerContent={<Icon name="languages" />}
    >
      {(close) => (
        <>
          {catalog.languages
            .filter((item) => item.enabled)
            .map((item) => (
              <Button
                key={item.code}
                lang={item.code}
                aria-pressed={locale === item.code}
                onClick={() => {
                  change(item.code, item.ui_locale);
                  close();
                }}
              >
                <LanguageLabel code={item.code} />
                {locale === item.code && <Icon name="check" />}
              </Button>
            ))}
        </>
      )}
    </ActionPopover>
  );
}
export function PublicLanguage() {
  const { site, route } = useRouteState(),
    { locale, change } = useLocale(),
    catalog = useLanguageCatalog(),
    t = useT(),
    toast = useToast();
  const variants =
    site.contentTranslations?.[normalizePath(route.split("?")[0])];
  const codeOwned = site.registeredPagePaths?.includes(
    normalizePath(route.split("?")[0]),
  );
  const displayLocale = useRegisteredPageLocale().locale;
  return (
    <ActionPopover
      label={t("语言")}
      className="icon-button"
      panelClassName={styles.menu}
      triggerContent={<Icon name="languages" />}
    >
      {(close) => (
        <>
          {catalog.languages
            .filter((item) => item.enabled)
            .map((item) => {
              const target = variants?.find(
                (member) => member.language === item.code,
              );
              const href = variants
                ? target?.path
                : localizeHref(route, item.code, catalog);
              const body = (
                <>
                  <LanguageLabel code={item.code} />
                  {item.code === (codeOwned ? displayLocale : locale) && (
                    <Icon name="check" />
                  )}
                </>
              );
              if (codeOwned)
                return (
                  <Button
                    key={item.code}
                    lang={item.code}
                    aria-pressed={item.code === displayLocale}
                    onClick={() => {
                      change(item.code, item.ui_locale);
                      close();
                    }}
                  >
                    {body}
                  </Button>
                );
              return href ? (
                <TextLink
                  key={item.code}
                  href={href}
                  lang={item.code}
                  hrefLang={item.code}
                  aria-current={locale === item.code ? "page" : undefined}
                  onClick={() => {
                    change(item.code, item.ui_locale);
                    close();
                  }}
                >
                  {body}
                </TextLink>
              ) : (
                <Button
                  key={item.code}
                  lang={item.code}
                  onClick={() => {
                    change(item.code, item.ui_locale);
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
