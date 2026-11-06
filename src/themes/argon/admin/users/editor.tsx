"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AccountProfile,
  PermissionCatalog,
  ProfileFields,
  AvatarCatalog,
} from "@/generated/accounts-contract";
import {
  createAccountUser,
  readAccountPermissions,
  readAccountUser,
  readUserAvatars,
  saveAccountUser,
} from "@/generated/accounts-client";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { UiText } from "@/core/i18n/provider";
import { Button, Form } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Avatar } from "../../components/ui/avatar";
import {
  AccountField,
  ProfileFieldsEditor,
  profileFields,
} from "../../account/fields";
import { UnsavedAccountChanges } from "../../account/unsaved";
import type { PermissionValues } from "../../account/permissions";
import { AdminPageHeading } from "../components/page-heading";
import { UserGrants } from "./grants";
import { ManagedUserSecurity } from "./security";

export function UserEditor({ id }: { id?: string }) {
  const actor = useAdminAccount(),
    { baseUrl, csrfToken } = useAdminRequest(),
    router = useRouter();
  const action = useAccountAction();
  const [saved, setSaved] = useState<AccountProfile | null>(null),
    [catalog, setCatalog] = useState<PermissionCatalog | null>(null),
    [avatars, setAvatars] = useState<AvatarCatalog | null>(null);
  const [fields, setFields] = useState<ProfileFields>(() =>
    profileFields({ display_name: "" }),
  );
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [current, setCurrent] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user"),
    [active, setActive] = useState(true),
    [grants, setGrants] = useState<Record<string, PermissionValues>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      try {
        const permissions = await readAccountPermissions(baseUrl, {
          signal: controller.signal,
          headers: { "X-Site-Locale": "zh-CN" },
        });
        const user = id
          ? await readAccountUser(baseUrl, id, { signal: controller.signal })
          : null;
        const images = id
          ? await readUserAvatars(baseUrl, id, { signal: controller.signal })
          : null;
        if (controller.signal.aborted) return;
        setCatalog(permissions.data);
        setAvatars(images?.data ?? null);
        if (user) {
          setSaved(user.data);
          setFields(profileFields(user.data));
          setRole(user.data.role);
          setActive(user.data.active);
          setGrants(user.data.grants);
          setUsername(user.data.username);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      }
    }
    void read();
    return () => controller.abort();
  }, [baseUrl, id]);
  const authorizationChanged =
    !saved ||
    role !== saved.role ||
    active !== saved.active ||
    JSON.stringify(grants) !== JSON.stringify(saved.grants);
  const dirty = saved
    ? authorizationChanged ||
      JSON.stringify(fields) !== JSON.stringify(profileFields(saved))
    : !!username ||
      !!fields.display_name ||
      !!password ||
      !!current ||
      !!Object.keys(grants).length;
  const forbidden = saved?.role === "admin" && actor.role !== "admin";
  const save = () =>
    action.run(async (signal) => {
      if (!id) {
        const input = {
          username,
          display_name: fields.display_name,
          password,
          current_password: current,
          role,
          grants,
        };
        const response = await createAccountUser(
          baseUrl,
          { ...input, operation_id: action.operation(input) },
          csrfToken,
          { signal },
        );
        if (!signal.aborted) {
          setPassword("");
          setCurrent("");
          router.replace("/admin/users/" + response.data.id);
        }
      } else if (saved) {
        const input = {
          expected_revision: saved.revision,
          value: fields,
          role,
          active,
          grants,
          current_password: current,
        };
        const response = await saveAccountUser(
          baseUrl,
          id,
          { ...input, operation_id: action.operation(input) },
          csrfToken,
          { signal },
        );
        if (!signal.aborted) {
          setSaved(response.data);
          setFields(profileFields(response.data));
          setCurrent("");
          if (id === actor.id && authorizationChanged)
            router.replace("/login?next=%2Faccount");
        }
      }
    });
  return (
    <>
      <AdminPageHeading
        title={id ? "编辑用户" : "新建用户"}
        action={
          <RouteLink href="/admin/users" className="admin-button">
            <UiText text="返回用户列表" />
          </RouteLink>
        }
      />
      {error && (
        <div className="account-card" role="alert">
          <UiText text={error} />
          <RouteLink href="/admin/users" className="admin-button">
            <UiText text="返回用户列表" />
          </RouteLink>
        </div>
      )}
      {catalog && (!id || saved) ? (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset
            className="account-fieldset"
            disabled={action.busy || forbidden}
          >
            <section className="account-card">
              <header className="account-managed-identity">
                <Avatar
                  name={fields.display_name || username || "?"}
                  src={fields.avatar_url}
                  size={60}
                />
                <div>
                  <h2>
                    {saved ? saved.display_name : <UiText text="创建账号" />}
                  </h2>
                  <p>
                    {saved ? (
                      "@" + saved.username
                    ) : (
                      <UiText text="新用户首次登录需要修改临时密码。" />
                    )}
                  </p>
                </div>
              </header>
              {!id ? (
                <div className="account-form-grid">
                  <AccountField
                    label="用户名"
                    value={username}
                    onChange={setUsername}
                    required
                    minLength={2}
                    maxLength={64}
                    autoComplete="off"
                    hint="创建后不可修改；使用英文字母、数字、点、下划线或短横线。"
                  />
                  <AccountField
                    label="显示名称"
                    value={fields.display_name}
                    onChange={(value) =>
                      setFields({ ...fields, display_name: value })
                    }
                    required
                    maxLength={100}
                  />
                  <div className="account-wide">
                    <AccountField
                      label="临时密码"
                      value={password}
                      onChange={setPassword}
                      secret
                      required
                      minLength={12}
                      maxLength={1024}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <ProfileFieldsEditor value={fields} onChange={setFields} />
                  <div className="account-field account-user-avatar-select">
                    <span>
                      <UiText text="用户的头像" />
                    </span>
                    <Select
                      name="managed-avatar"
                      label="用户的头像"
                      value={fields.avatar_id ?? "none"}
                      options={[
                        { value: "none", label: "清除头像" },
                        ...(avatars?.items
                          .filter((item) => item.status === "ready")
                          .map((item) => ({
                            value: item.id,
                            label: item.filename,
                          })) ?? []),
                      ]}
                      onValueChange={(value) => {
                        const image = avatars?.items.find(
                          (item) => item.id === value,
                        );
                        setFields({
                          ...fields,
                          avatar_id: image?.id ?? null,
                          avatar_url: image?.url ?? "",
                        });
                      }}
                    />
                    <small>
                      <UiText text="仅可选择该用户本人头像图库中的图片。" />
                    </small>
                  </div>
                </>
              )}
            </section>
            <section className="account-card">
              <header>
                <h2>
                  <UiText text="角色与授权" />
                </h2>
              </header>
              <div className="account-role-controls">
                <div className="account-field">
                  <span>
                    <UiText text="账号角色" />
                  </span>
                  <Select
                    name="user-role"
                    label="账号角色"
                    programOptions
                    value={role}
                    options={
                      actor.role === "admin"
                        ? [
                            { value: "user", label: "成员" },
                            { value: "admin", label: "管理员" },
                          ]
                        : [{ value: "user", label: "成员" }]
                    }
                    onValueChange={(value) =>
                      setRole(value as "admin" | "user")
                    }
                  />
                </div>
                {!!id && (
                  <div className="account-state-control">
                    <span id="user-active-label">
                      <UiText text="启用账号" />
                    </span>
                    <Switch
                      aria-labelledby="user-active-label"
                      checked={active}
                      onCheckedChange={setActive}
                    />
                  </div>
                )}
              </div>
              {role === "admin" ? (
                <p className="account-policy-help">
                  <UiText text="管理员拥有全部系统权限；API Key 仍需单独选择权限。" />
                </p>
              ) : (
                <UserGrants
                  catalog={catalog}
                  value={grants}
                  onChange={setGrants}
                />
              )}
              {id === actor.id && (
                <p className="account-policy-help">
                  <UiText text="更改自己的角色或授权后需要重新登录。" />
                </p>
              )}
            </section>
            <section className="account-card">
              <AccountField
                label="确认操作密码"
                value={current}
                onChange={setCurrent}
                secret
                required={authorizationChanged}
                autoComplete="current-password"
                hint="创建用户、更改角色、授权或启停账号时，填写你的当前密码。"
              />
              <div className="account-actions">
                <Button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={!dirty}
                >
                  <UiText
                    text={
                      action.busy ? "正在保存…" : id ? "保存用户" : "创建用户"
                    }
                  />
                </Button>
              </div>
              <p className="account-message" role="status">
                <UiText text={action.message} />
              </p>
            </section>
          </fieldset>
        </Form>
      ) : (
        !error && (
          <p role="status">
            <UiText text="正在读取用户资料…" />
          </p>
        )
      )}
      {saved && !forbidden && (
        <ManagedUserSecurity
          user={saved}
          onChanged={setSaved}
          isSelf={id === actor.id}
        />
      )}
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
    </>
  );
}
