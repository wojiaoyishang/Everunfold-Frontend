"use client";
import { UiText } from "@/core/i18n/provider";

import type { TranslationMember } from "@/generated/content-admin-contract";
import { localeNames, localeOf } from "@/core/i18n/locale";
import { ActionPopover } from "../../components/ui/action-popover";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import styles from "./translations.module.css";

export const translationStatus = (item: TranslationMember) =>
  item.status === "trash"
    ? "已回收"
    : item.published_revision
      ? item.needs_review
        ? "已发布 · 待检查"
        : "已发布"
      : "草稿";
export function TranslationMenu({
  members,
  type,
  current,
  original,
  disabled,
  onNavigate,
}: {
  members: TranslationMember[];
  type: string;
  current: string;
  original: string;
  disabled?: boolean;
  onNavigate?: (href: string) => void;
}) {
  return (
    <ActionPopover
      label="切换编辑语言"
      panelWidth={300}
      panelClassName={styles.popover}
      className={styles.trigger}
      disabled={disabled}
      triggerContent={
        <>
          <Icon name="languages" />
          <span>
            {members.find((item) => item.id === current)?.language === "en" ? (
              "EN"
            ) : (
              <UiText text="中文" />
            )}
            {members.length > 1 ? ` · ${members.length}` : ""}
          </span>
        </>
      }
    >
      {(close) => (
        <div className={styles.menu}>
          <strong>
            <UiText text="语言版本" />
          </strong>
          {members.map((item) => {
            const href = `/admin/content/${type}/${item.id}/edit`;
            const body = (
              <>
                <span>
                  {localeNames[localeOf(item.language)]}
                  {item.is_original ? <UiText text=" · 原文" /> : ""}
                </span>
                <small>
                  <UiText text={translationStatus(item)} />
                </small>
              </>
            );
            return onNavigate ? (
              <Button
                key={item.id}
                className={styles.member}
                aria-current={item.id === current ? "page" : undefined}
                onClick={() => {
                  close();
                  onNavigate(href);
                }}
              >
                {body}
              </Button>
            ) : (
              <RouteLink
                key={item.id}
                className={styles.member}
                href={href}
                aria-current={item.id === current ? "page" : undefined}
                onClick={close}
              >
                {body}
              </RouteLink>
            );
          })}
          <RouteLink
            href={`/admin/content/${type}/${original}/edit#content-languages`}
            className={styles.manage}
            onClick={(event) => {
              close();
              if (onNavigate) {
                event.preventDefault();
                onNavigate(
                  `/admin/content/${type}/${original}/edit#content-languages`,
                );
              }
            }}
          >
            <UiText text="管理语言与译文" />
          </RouteLink>
        </div>
      )}
    </ActionPopover>
  );
}
