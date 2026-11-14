"use client";

import { useEffect, useId, useState } from "react";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import {
  readDiscussionSettings,
  saveDiscussionSettings,
  type DiscussionSettings,
} from "@/core/contracts/settings";
import { UiText } from "@/core/i18n/provider";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { useToast } from "../../components/ui/toast/toast-provider";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "./section-navigation";
import {
  SettingsSaveBar,
  SettingsSection,
  SettingsText,
  SettingsToggle,
} from "./shared";

function keywords(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function discussionDraft(settings: DiscussionSettings) {
  return {
    guests: settings.allow_guest_comments,
    trusted: settings.auto_approve_previously_approved,
    links: String(settings.moderation_link_threshold),
    moderation: settings.moderation_keywords.join("\n"),
    blocked: settings.blocked_keywords.join("\n"),
  };
}

export function DiscussionPage() {
  const user = useAdminAccount();
  const { baseUrl, csrfToken } = useAdminRequest();
  const toast = useToast();
  const canRead = can(user, "settings:read");
  const canEdit = can(user, "settings:write");
  const [loaded, setLoaded] = useState<DiscussionSettings | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof discussionDraft> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const action = useAccountAction();
  const limitId = useId();
  const saved = loaded ? discussionDraft(loaded) : null;
  const dirty =
    !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    if (!canRead) return;
    const controller = new AbortController();
    void readDiscussionSettings(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setLoaded(data);
        setDraft(discussionDraft(data));
        setError("");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(accountFailure(reason));
      });
    return () => controller.abort();
  }, [baseUrl, canRead, reload]);

  const checkKeywords = (value: string) => {
    const lines = keywords(value);
    return (
      lines.length > 100 || lines.some((line) => Array.from(line).length > 100)
    );
  };
  const invalidKeywords =
    !!draft &&
    (checkKeywords(draft.moderation) || checkKeywords(draft.blocked));

  async function save() {
    if (!loaded || !draft || !dirty || !canEdit) return;
    if (invalidKeywords) {
      toast.show({
        id: "discussion-keywords",
        title: "每组最多 100 个关键词，每个最多 100 个字符。",
        tone: "error",
        placement: "top-center",
        duration: 5000,
        countdown: true,
      });
      return;
    }
    const ok = await action.run(async (signal) => {
      const { data } = await saveDiscussionSettings(
        baseUrl,
        {
          revision: loaded.revision,
          allow_guest_comments: draft.guests,
          auto_approve_previously_approved: draft.trusted,
          moderation_link_threshold: Number(draft.links),
          moderation_keywords: keywords(draft.moderation),
          blocked_keywords: keywords(draft.blocked),
        },
        csrfToken,
        { signal },
      );
      if (!signal.aborted) {
        setLoaded(data);
        setDraft(discussionDraft(data));
      }
    }, "");
    if (ok)
      toast.show({
        id: "discussion-save",
        title: "讨论设置已保存。",
        tone: "success",
        placement: "top-center",
        countdown: true,
        duration: 3500,
      });
  }

  function refresh() {
    setError("");
    setLoaded(null);
    setDraft(null);
    action.setMessage("");
    setReload((current) => current + 1);
  }

  return (
    <SettingsLayout>
      <AdminPageHeading title="讨论设置" />
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
      {!canRead ? (
        <p role="alert">
          <UiText text="没有读取设置的权限。" />
        </p>
      ) : error ? (
        <div className="admin-settings-message is-error" role="alert">
          <UiText text={error} />
          <Button className="admin-button" onClick={refresh}>
            <UiText text="重新读取" />
          </Button>
        </div>
      ) : !draft ? (
        <div className="admin-settings-loading" role="status">
          <UiText text="正在读取设置…" />
        </div>
      ) : (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset
            className="admin-settings-form"
            disabled={!canEdit || action.busy}
          >
            <SettingsSection
              id="discussion-participation"
              title="发表评论"
              description="各篇内容仍可单独关闭评论。"
            >
              <SettingsToggle
                label="允许访客发表评论"
                value={draft.guests}
                onChange={(guests) => setDraft({ ...draft, guests })}
              />
              <SettingsToggle
                label="自动通过有审核记录的用户"
                hint="账号需通过邮箱验证，且已有至少一条通过审核的评论。"
                value={draft.trusted}
                onChange={(trusted) => setDraft({ ...draft, trusted })}
              />
            </SettingsSection>
            <SettingsSection
              id="discussion-moderation"
              title="审核规则"
              description="拒绝规则优先，命中待审核规则的评论始终需要人工审核。"
            >
              <div className="admin-settings-field">
                <label htmlFor={limitId}>
                  <UiText text="触发人工审核的链接数量" />
                </label>
                <TextField
                  id={limitId}
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  required
                  value={draft.links}
                  aria-describedby={`${limitId}-hint`}
                  onChange={(event) =>
                    setDraft({ ...draft, links: event.target.value })
                  }
                />
                <small id={`${limitId}-hint`}>
                  <UiText text="达到此数量即转人工审核，设为 0 时关闭此规则。" />
                </small>
              </div>
              <SettingsText
                label="待审核关键词"
                placeholder="每行填写一个关键词"
                value={draft.moderation}
                onChange={(moderation) => setDraft({ ...draft, moderation })}
                maxLength={10000}
                multiline
              />
              <SettingsText
                label="拒绝关键词"
                placeholder="每行填写一个关键词"
                value={draft.blocked}
                onChange={(blocked) => setDraft({ ...draft, blocked })}
                maxLength={10000}
                multiline
              />
            </SettingsSection>
          </fieldset>
          {action.message && (
            <div className="admin-settings-message is-error" role="alert">
              <UiText text={action.message} />
              <Button className="admin-button" onClick={refresh}>
                <UiText text="放弃本地修改并载入服务器版本" />
              </Button>
            </div>
          )}
          {canEdit && (
            <SettingsSaveBar
              dirty={dirty}
              busy={action.busy}
              status={<UiText text="设置已读取" />}
              onReset={() => {
                setDraft(saved);
                action.setMessage("");
              }}
            />
          )}
        </Form>
      )}
    </SettingsLayout>
  );
}
