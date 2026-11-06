"use client";
import { useState } from "react";
import type { PermissionCatalog } from "@/generated/accounts-contract";
import { useAdminAccount } from "@/core/admin/account-context";
import { UiText } from "@/core/i18n/provider";
import { Select } from "../../components/ui/select";
import {
  PermissionPicker,
  type PermissionValues,
} from "../../account/permissions";

export function UserGrants({
  catalog,
  value,
  onChange,
}: {
  catalog: PermissionCatalog;
  value: Record<string, PermissionValues>;
  onChange: (value: Record<string, PermissionValues>) => void;
}) {
  const actor = useAdminAccount(),
    [selected, setSelected] = useState("everunfold");
  const applications = [
    {
      id: "everunfold",
      name: "Everunfold",
      scopes: catalog.items,
      permissions:
        actor.role === "admin"
          ? Object.fromEntries(
              catalog.items.map((item) => [item.code, "all" as const]),
            )
          : (actor.permissions ?? {}),
    },
    ...(catalog.applications ?? []),
  ];
  const app =
    applications.find((item) => item.id === selected) ?? applications[0];
  return (
    <>
      <div className="account-field account-grant-selector">
        <span>
          <UiText text="授权目标" />
        </span>
        <Select
          name="grant-audience"
          label="授权目标"
          value={app.id}
          options={applications.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onValueChange={setSelected}
        />
      </div>
      <PermissionPicker
        programLabels={app.id === "everunfold"}
        definitions={app.scopes}
        ceiling={app.permissions}
        value={value[app.id] ?? {}}
        onChange={(permissions) => {
          const next = { ...value };
          if (Object.keys(permissions).length) next[app.id] = permissions;
          else delete next[app.id];
          onChange(next);
        }}
      />
      <p className="account-policy-help">
        <UiText text="未选择的能力不可使用。Key 还需要单独选择权限，且不能超过用户的当前授权。" />
      </p>
    </>
  );
}
