"use client";
import { useState } from "react";
import type {
  AccountProfile,
  ProfileFields,
} from "@/generated/accounts-contract";
import {
  readAccountProfile,
  saveAccountProfile,
} from "@/generated/accounts-client";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import {
  UiText,
  useLocale,
  useLanguageCatalog,
  useT,
} from "@/core/i18n/provider";
import { Button, Form } from "../components/ui/primitives";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { ProfileFieldsEditor, profileFields } from "./fields";
import { UnsavedAccountChanges } from "./unsaved";
import { AvatarPicker } from "./avatar-picker";
import { Avatar } from "../components/ui/avatar";
import { Icon } from "../components/icon";

export function AccountProfileEditor({
  profile,
  onSaved,
}: {
  profile: AccountProfile;
  onSaved: (value: AccountProfile) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [value, setValue] = useState<ProfileFields>(() =>
    profileFields(profile),
  );
  const [latest, setLatest] = useState<AccountProfile | null>(null);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const action = useAccountAction();
  const t = useT();
  const locale = useLocale();
  const languages = useLanguageCatalog();
  const dirty =
    JSON.stringify(value) !== JSON.stringify(profileFields(profile));
  const save = () =>
    action.run(async (signal) => {
      const input = { expected_revision: profile.revision, value };
      const response = await saveAccountProfile(
        baseUrl,
        { ...input, operation_id: action.operation(input) },
        csrfToken,
        { signal },
      );
      if (!signal.aborted) {
        setValue(profileFields(response.data));
        onSaved(response.data);
        if (response.data.preferred_locale !== profile.preferred_locale)
          locale.change(
            response.data.preferred_locale ?? "zh-CN",
            languages.languages.find(
              (item) => item.code === response.data.preferred_locale,
            )?.ui_locale,
          );
      }
    });
  return (
    <section className="account-card account-profile-card">
      <aside className="account-profile-identity">
        <Button
          className="account-profile-avatar-trigger"
          aria-label={t("更换头像")}
          disabled={action.busy || profile.must_change_password}
          onClick={() => setPickingAvatar(true)}
        >
          <Avatar
            name={value.display_name || profile.username}
            src={value.avatar_url}
            size={104}
          />
          <span className="account-profile-avatar-icon">
            <Icon name="image" />
          </span>
          <small>
            <UiText text="更换头像" />
          </small>
        </Button>
        <div className="account-profile-identity-text">
          <h2>{value.display_name || profile.username}</h2>
          <span>@{profile.username}</span>
          <div>
            <span className="admin-badge">
              <UiText text={profile.role === "admin" ? "管理员" : "成员"} />
            </span>
          </div>
        </div>
        {!!value.avatar_url && (
          <Button
            className="account-avatar-clear"
            disabled={action.busy}
            onClick={() =>
              setValue((current) => ({
                ...current,
                avatar_id: null,
                avatar_url: "",
              }))
            }
          >
            <UiText text="清除头像" />
          </Button>
        )}
        {(value.avatar_id !== profile.avatar_id ||
          value.avatar_url !== profile.avatar_url) && (
          <small className="account-avatar-pending">
            <UiText text="头像将在保存资料后更新。" />
          </small>
        )}
        <div className="account-profile-since">
          <UiText text="加入于" />{" "}
          {new Date(profile.created_at).toLocaleDateString(locale.uiLocale)}
        </div>
      </aside>
      <div className="account-profile-content">
        <header>
          <h2>
            <UiText text="个人资料" />
          </h2>
          <p>
            <UiText text="设置你的显示名称、联系信息与个人介绍。" />
          </p>
        </header>
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={action.busy} className="account-fieldset">
            <ProfileFieldsEditor value={value} onChange={setValue} />
            <div className="account-actions">
              <Button
                className="admin-button admin-button-primary"
                type="submit"
                disabled={!dirty}
              >
                <UiText text={action.busy ? "正在保存…" : "保存资料"} />
              </Button>
              <Button
                className="admin-button"
                onClick={() =>
                  void action.run(async (signal) => {
                    const response = await readAccountProfile(baseUrl, {
                      signal,
                    });
                    if (!signal.aborted) setLatest(response.data);
                  })
                }
              >
                <UiText text="读取最新资料" />
              </Button>
            </div>
          </fieldset>
        </Form>
        <p className="account-message" role="status">
          <UiText text={action.message} />
        </p>
      </div>
      {pickingAvatar && (
        <AvatarPicker
          selectedId={value.avatar_id}
          protectedId={profile.avatar_id}
          onClose={() => setPickingAvatar(false)}
          onSelect={(avatar) => {
            setValue((current) => ({
              ...current,
              avatar_id: avatar.id,
              avatar_url: avatar.url ?? "",
            }));
            setPickingAvatar(false);
          }}
        />
      )}
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
      <ConfirmDialog
        open={!!latest}
        title="合并最新资料"
        description="没有在本地修改的字段将采用最新值；本地修改将保留，请核对后再次保存。"
        confirmLabel="保留输入并更新基线"
        onCancel={() => setLatest(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          if (!latest) return;
          const previous = profileFields(profile),
            next = profileFields(latest);
          const merged = Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
              key,
              item === previous[key as keyof ProfileFields]
                ? next[key as keyof ProfileFields]
                : item,
            ]),
          ) as ProfileFields;
          onSaved(latest);
          setValue(merged);
          setLatest(null);
          action.setMessage("已合并未修改的字段，请检查后保存。");
        }}
      >
        {latest && (
          <dl className="account-comparison">
            {Object.entries(profileFields(latest))
              .filter(
                ([key, item]) =>
                  key !== "avatar_id" &&
                  item !== profileFields(profile)[key as keyof ProfileFields],
              )
              .map(([key, item]) => (
                <div key={key}>
                  <dt>
                    <UiText
                      text={
                        (
                          {
                            display_name: "显示名称",
                            email: "邮箱",
                            avatar_url: "头像",
                            bio: "个人简介",
                            website: "个人网站",
                            preferred_locale: "偏好语言",
                          } as Record<string, string>
                        )[key] ?? key
                      }
                    />
                  </dt>
                  <dd>
                    {key === "avatar_url" ? (
                      <Avatar
                        src={String(item)}
                        name={latest.display_name}
                        size={44}
                      />
                    ) : (
                      String(item || "—")
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        )}
      </ConfirmDialog>
    </section>
  );
}
