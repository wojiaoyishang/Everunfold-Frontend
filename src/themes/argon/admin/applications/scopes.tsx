"use client";
import type {
  ApplicationScope,
  PermissionDefinition,
} from "@/core/contracts/accounts";
import { UiText } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Switch } from "../../components/ui/switch";
import { AccountField } from "../../account/fields";
import { PermissionPicker } from "../../account/permissions";

export function ApplicationScopes({
  builtin,
  audience,
  definitions,
  value,
  onChange,
}: {
  builtin: boolean;
  audience: string;
  definitions: PermissionDefinition[];
  value: ApplicationScope[];
  onChange: (value: ApplicationScope[]) => void;
}) {
  if (builtin)
    return (
      <>
        <p className="account-policy-help">
          <UiText text="内置应用权限由代码维护。建议为每个子项目单独创建接入应用。" />
        </p>
        <div className="account-scope-tags">
          {definitions
            .filter((item) => item.api_key)
            .map((item) => (
              <span key={item.code}>{item.code}</span>
            ))}
        </div>
      </>
    );
  if (audience === "everunfold")
    return (
      <PermissionPicker
        definitions={definitions.filter((item) => item.api_key)}
        ceiling={Object.fromEntries(
          definitions
            .filter((item) => item.api_key)
            .map((item) => [item.code, "all"]),
        )}
        value={Object.fromEntries(value.map((item) => [item.code, "all"]))}
        onChange={(selected) =>
          onChange(
            definitions
              .filter((item) => selected[item.code])
              .map((item) => ({
                code: item.code,
                label: item.label,
                owner_scope: item.owner_scope,
                api_key: true,
              })),
          )
        }
      />
    );
  return (
    <div className="account-custom-scopes">
      {value.map((scope, index) => {
        const change = (next: Partial<ApplicationScope>) =>
          onChange(
            value.map((item, position) =>
              position === index ? { ...item, ...next } : item,
            ),
          );
        return (
          <div className="account-custom-scope" key={index}>
            <AccountField
              label="权限代码"
              value={scope.code}
              onChange={(code) => change({ code })}
              required
              maxLength={80}
              hint="例如 reports:read，创建 Key 时将按此代码授权。"
            />
            <AccountField
              label="显示名称"
              value={scope.label}
              onChange={(label) => change({ label })}
              required
              maxLength={100}
            />
            <div className="account-state-control">
              <span id={`scope-owner-${index}`}>
                <UiText text="支持仅本人范围" />
              </span>
              <Switch
                aria-labelledby={`scope-owner-${index}`}
                checked={scope.owner_scope ?? false}
                onCheckedChange={(owner_scope) => change({ owner_scope })}
              />
            </div>
            <Button
              className="admin-button"
              onClick={() =>
                onChange(value.filter((_, position) => position !== index))
              }
            >
              <UiText text="移除权限" />
            </Button>
          </div>
        );
      })}
      <Button
        className="admin-button"
        disabled={value.length >= 64}
        onClick={() =>
          onChange([
            ...value,
            { code: "", label: "", owner_scope: false, api_key: true },
          ])
        }
      >
        <UiText text="添加权限" />
      </Button>
    </div>
  );
}
