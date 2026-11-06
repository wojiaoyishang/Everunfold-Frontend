"use client";
import type { PageTranslationCatalog } from "@/core/contracts/pages";
import { UiText, useT } from "@/core/i18n/provider";
import { LanguageLabel } from "../../components/language-label";
import { ActionPopover } from "../../components/ui/action-popover";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import styles from "../content/translations.module.css";
import { LanguageTrigger } from "../content/language-trigger";

export function PageLanguageMenu({
  group,
  current,
}: {
  group: PageTranslationCatalog;
  current: string;
}) {
  const t = useT();
  return (
    <ActionPopover
      label={t("切换编辑语言")}
      panelWidth={300}
      className={styles.trigger}
      panelClassName={styles.popover}
      triggerContent={
        <LanguageTrigger
          code={group.members.find((m) => m.id === current)?.language}
          count={group.members.length}
        />
      }
    >
      {(close) => (
        <div className={styles.menu}>
          <strong>
            <UiText text="语言版本" />
          </strong>
          {group.members.map((member) => (
            <RouteLink
              key={member.id}
              className={styles.member}
              href={`/admin/pages/${member.id}`}
              aria-current={member.id === current ? "page" : undefined}
              onClick={close}
            >
              <span>
                <LanguageLabel code={member.language} />
                {member.is_original && <UiText text=" · 原文" />}
              </span>
              <small>
                <UiText
                  text={
                    member.archived
                      ? "已回收"
                      : member.needs_review
                        ? "待检查"
                        : member.enabled
                          ? "已启用"
                          : "草稿"
                  }
                />
              </small>
            </RouteLink>
          ))}
          <RouteLink
            className={styles.member}
            href={`/admin/pages/${current}#page-languages`}
            onClick={close}
          >
            <Icon name="settings" />
            <UiText text="管理语言" />
          </RouteLink>
        </div>
      )}
    </ActionPopover>
  );
}
