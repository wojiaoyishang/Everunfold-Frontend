"use client";
import { useLocale, useT, useLanguageCatalog } from "@/core/i18n/provider";
import { localizeHref } from "@/core/i18n/locale";

import type { Content } from "@/core/content/types";
import { normalizePath } from "@/core/content/urls";
import { useRouteState } from "./route-state";
import { Icon } from "./icon";
import { ActionPopover } from "./ui/action-popover";
import { Button, TextLink } from "./ui/primitives";
import { useToast } from "./ui/toast/toast-provider";
import styles from "./languages.module.css";
import { LanguageLabel } from "./language-label";
import { defaultFlag } from "@/core/i18n/catalog";

function LanguageGlyph({ code }: { code: string }) {
  const catalog = useLanguageCatalog();
  return (
    <span className={styles.glyph}>
      <Icon name="languages" />
      <span className={styles.badge} aria-hidden="true">
        {catalog.languages.find((item) => item.code === code)?.flag ||
          defaultFlag(code)}
      </span>
    </span>
  );
}

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
  return (
    <ActionPopover
      label={t("语言")}
      className="icon-button"
      panelClassName={styles.menu}
      triggerContent={<LanguageGlyph code={locale} />}
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
                  {item.code === locale && <Icon name="check" />}
                </>
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
export function ContentLanguages({
  content,
}: {
  content: Pick<Content, "id" | "language" | "translations">;
}) {
  const { change } = useLocale(),
    catalog = useLanguageCatalog();
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
          onClick={() =>
            change(
              item.language,
              catalog.languages.find((entry) => entry.code === item.language)
                ?.ui_locale,
            )
          }
          aria-current={item.id === content.id ? "page" : undefined}
        >
          <LanguageLabel code={item.language} />
          {item.id === content.id && <Icon name="check" />}
          {item.access !== "public" && <Icon name="lock" />}
        </TextLink>
      ))}
    </nav>
  );
}
