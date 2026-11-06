"use client";
import { useEffect, useState } from "react";
import type {
  NavigationReference,
  NavigationResource,
} from "@/generated/settings-contract";
import { queryNavigationResources } from "@/generated/settings-client";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure } from "@/core/accounts/use-action";
import { UiText } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";

export function NavigationReferenceField({
  reference,
  onChoose,
}: {
  reference: NavigationReference;
  onChoose: () => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const key = `${reference.kind}:${reference.id}`;
  const [state, setState] = useState<{
    key: string;
    resource?: NavigationResource;
    error?: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void queryNavigationResources(
      baseUrl,
      { kind: reference.kind, id: reference.id },
      csrfToken,
      { signal: controller.signal },
    )
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setState({ key, resource: data.items[0] });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setState({ key, error: accountFailure(cause) });
      });
    return () => controller.abort();
  }, [baseUrl, csrfToken, key, reference.id, reference.kind]);
  const current = state?.key === key ? state : null;
  return (
    <div className="admin-settings-field">
      <span>
        <UiText text="关联内容" />
      </span>
      {current?.resource && (
        <div className="admin-navigation-reference">
          <strong>
            {current.resource.title || <UiText text="未命名说说" />}
          </strong>
          <small>{current.resource.path}</small>
        </div>
      )}
      {!current && (
        <p role="status" className="admin-settings-hint">
          <UiText text="正在读取内容…" />
        </p>
      )}
      {current?.error && <p role="alert">{current.error}</p>}
      {current && !current.error && !current.resource && (
        <p className="admin-settings-hint">
          <UiText text="关联内容尚未发布或已停用，菜单会隐藏。" />
        </p>
      )}
      <Button className="admin-button" onClick={onChoose}>
        <Icon name="link" />
        <UiText text="重新选择内容" />
      </Button>
      <p className="admin-settings-hint">
        <UiText text="地址由关联内容自动维护，目标未发布或停用时隐藏此菜单。" />
      </p>
    </div>
  );
}
