"use client";
import { UiText, useT } from "@/core/i18n/provider";

import type { TranslationMember } from "@/generated/content-admin-contract";

import { LanguageLabel } from "../../components/language-label";
import { ActionPopover } from "../../components/ui/action-popover";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import styles from "./translations.module.css";
import { LanguageTrigger } from "./language-trigger";

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
  readOnly = false,
  publicLinks = false,
}: {
  members: TranslationMember[];
  type: string;
  current: string;
  original: string;
  disabled?: boolean;
  onNavigate?: (href: string) => void;
  readOnly?: boolean;
  publicLinks?: boolean;
}) {
  const t = useT();
  return (
    <ActionPopover
      label="切换编辑语言"
      panelWidth={300}
      panelClassName={styles.popover}
      className={styles.trigger}
      disabled={disabled}
      triggerContent={
        <LanguageTrigger
          code={members.find((item) => item.id === current)?.language}
          count={members.length}
        />
      }
    >
      {(close) => (
        <div className={styles.menu}>
          <strong>
            <UiText text="语言版本" />
          </strong>
          {members.map((item) => {
            const href = `/admin/content/${type}/${item.id}/${readOnly ? "preview" : "edit"}`;
            const body = (
              <>
                <span>
                  <LanguageLabel code={item.language} />
                  {item.is_original ? <UiText text=" · 原文" /> : ""}
                </span>
                <small>
                  <UiText text={translationStatus(item)} />
                </small>
              </>
            );
            const editorLink = onNavigate ? (
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
            return publicLinks ? (
              <div key={item.id} className={styles.memberRow}>
                {editorLink}
                {item.status !== "trash" &&
                item.published_revision &&
                item.public_path ? (
                  <RouteLink
                    className={styles.viewPublished}
                    href={item.public_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("在前台打开")}
                    aria-label={`${t("在前台打开")} ${item.language}`}
                    onClick={close}
                  >
                    <Icon name="external" />
                  </RouteLink>
                ) : null}
              </div>
            ) : (
              editorLink
            );
          })}
          {!readOnly && (
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
          )}
        </div>
      )}
    </ActionPopover>
  );
}
