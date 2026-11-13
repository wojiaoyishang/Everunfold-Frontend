"use client";
import { UiText } from "@/core/i18n/provider";
import { usePageTypes } from "@/core/pages/use-types";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
import { ManagedPageEditor } from "./editor";
import styles from "./pages.module.css";

export function NewManagedPage({ typeId }: { typeId: string }) {
  const { items, loading, error, reload } = usePageTypes();
  const selected = items.find((type) => type.id === typeId);
  if (selected?.available)
    return <ManagedPageEditor key={typeId} pageType={selected} />;
  return (
    <>
      <AdminPageHeading
        title="新建页面"
        action={
          <RouteLink href="/admin/pages/new" className="admin-button">
            <UiText text="选择页面类型" />
          </RouteLink>
        }
      />
      {loading ? (
        <p role="status" className="account-card">
          <UiText text="正在读取页面类型…" />
        </p>
      ) : (
        <div className={styles.typeError} role="alert">
          <p>{error || <UiText text="此页面类型当前不可用。" />}</p>
          {error && (
            <Button className="admin-button" onClick={reload}>
              <UiText text="重试" />
            </Button>
          )}
        </div>
      )}
    </>
  );
}
