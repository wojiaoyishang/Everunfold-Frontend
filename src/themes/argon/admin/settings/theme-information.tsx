"use client";
import { useState } from "react";
import type { InstalledTheme } from "@/core/contracts/settings";
import { resourceUrl } from "@/core/content/urls";
import { UiText, useT } from "@/core/i18n/provider";
import { TextLink } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./theme-card.module.css";

export function ThemePreview({ source }: { source?: string }) {
  const [failed, setFailed] = useState(false);
  const src = resourceUrl(source);
  return src && !failed ? (
    // Theme artwork is deployment-owned and may use ordinary public/ resources.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={styles.placeholder} aria-hidden="true">
      <Icon name="image" />
    </span>
  );
}

export function ThemeInformation({ theme }: { theme: InstalledTheme }) {
  const t = useT(),
    authorUrl = resourceUrl(theme.author?.url);
  const links = [
    ["项目主页", resourceUrl(theme.homepage)],
    ["源代码", resourceUrl(theme.repository)],
  ] as const;
  return (
    <div className={styles.details}>
      <div className={styles.identity}>
        <span>{theme.id}</span>
        <span>v{theme.version}</span>
      </div>
      <dl>
        {theme.author && (
          <div>
            <dt>
              <UiText text="开发者" />
            </dt>
            <dd>
              {authorUrl ? (
                <TextLink
                  href={authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {theme.author.name}
                </TextLink>
              ) : (
                theme.author.name
              )}
            </dd>
          </div>
        )}
        <div>
          <dt>
            <UiText text="父主题" />
          </dt>
          <dd>{theme.parent || <UiText text="主主题" />}</dd>
        </div>
        {theme.license && (
          <div>
            <dt>
              <UiText text="许可证" />
            </dt>
            <dd>{theme.license}</dd>
          </div>
        )}
      </dl>
      {links.some(([, href]) => href) && (
        <nav
          className={styles.links}
          aria-label={`${t("主题相关链接")}：${theme.title}`}
        >
          {links.map(
            ([label, href]) =>
              href && (
                <TextLink
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <UiText text={label} />
                  <Icon name="external" />
                </TextLink>
              ),
          )}
        </nav>
      )}
    </div>
  );
}
