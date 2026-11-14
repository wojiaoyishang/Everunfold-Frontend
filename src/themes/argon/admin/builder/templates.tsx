"use client";
import { useEffect, useRef, useState } from "react";
import type { BuilderDocument } from "@/core/builder/types";
import type { MediaURL } from "@/core/contracts/content-admin";
import {
  readPageTemplate,
  readPageTypes,
  type PageTypeItem,
} from "@/core/contracts/pages";
import { useAdminRequest } from "@/core/admin/account-context";
import { UiText } from "@/core/i18n/provider";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Select } from "../../components/ui/select";
import styles from "./editor.module.css";

export function BuilderTemplates({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (
    document: BuilderDocument,
    mediaUrls: Record<string, MediaURL>,
  ) => void;
}) {
  const { baseUrl } = useAdminRequest();
  const [list, setList] = useState<PageTypeItem[]>();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const pending = useRef<{
    document: BuilderDocument;
    mediaUrls: Record<string, MediaURL>;
  } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    void readPageTypes(baseUrl, { signal: abort.signal })
      .then(({ data }) => {
        if (!abort.signal.aborted)
          setList(
            data.items.filter((item) => item.available && item.template_id),
          );
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setList([]);
          setError("无法获取模板");
        }
      });
    return () => abort.abort();
  }, [baseUrl]);
  return (
    <ConfirmDialog
      open
      title="插入模板"
      confirmLabel="插入"
      confirmDisabled={!selected}
      error={error}
      onCancel={onClose}
      onConfirm={async () => {
        setError("");
        try {
          const { data } = await readPageTemplate(baseUrl, selected);
          const document = data.value.component_document;
          if (
            data.value.edit_mode !== "components" ||
            !document?.nodes.length
          ) {
            setError("该模板没有可插入的组件");
            return false;
          }
          pending.current = { document, mediaUrls: data.media_urls ?? {} };
          return true;
        } catch {
          setError("无法读取模板");
          return false;
        }
      }}
      onConfirmed={() => {
        if (pending.current)
          onInsert(pending.current.document, pending.current.mediaUrls);
        else onClose();
      }}
    >
      <div className={styles.panelBody}>
        {list?.length ? (
          <Select
            name="builder-template"
            label="页面模板"
            value={selected}
            options={list.map((item) => ({
              value: item.template_id!,
              label: item.title,
            }))}
            onValueChange={setSelected}
          />
        ) : (
          <UiText text={list ? (error ? "" : "暂无模板") : "正在读取…"} />
        )}
      </div>
    </ConfirmDialog>
  );
}
