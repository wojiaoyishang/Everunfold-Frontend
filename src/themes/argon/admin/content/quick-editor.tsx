"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import {
  metadataPatch,
  metadataValues,
  type MetadataValues,
} from "@/core/content-management/metadata-patch";
import { draftError } from "@/core/content-management/draft-state";
import {
  mutateDraftBatch,
  readDraft,
  type DraftListItem,
  type ContentTypeDefinition,
  type EditorTerm,
} from "@/core/contracts/content-admin";
import { Form, TextField, TextArea } from "../../components/ui/primitives";
import { FormField } from "../../components/ui/form-field";
import { TokenField } from "../../components/ui/token-field";
import { Switch } from "../../components/ui/switch";
import { AdminActionButton } from "../components/action-button";
import { afterDialogMotion } from "../../hooks/dialog-motion";
import styles from "./management.module.css";
export function QuickEditor({
  item,
  type,
  terms,
  onClose,
  onSaved,
}: {
  item: DraftListItem;
  type: ContentTypeDefinition;
  terms: EditorTerm[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest(),
    action = useAccountAction(draftError),
    id = useId(),
    t = useT();
  const [base, setBase] = useState(item),
    [values, setValues] = useState(() => metadataValues(item)),
    [closing, setClosing] = useState(false),
    [done, setDone] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useLayoutEffect(() => {
    form.current?.querySelector("input")?.focus({ preventScroll: true });
    form.current?.scrollIntoView({ block: "start" });
  }, []);
  useLayoutEffect(() => {
    if (closing)
      return afterDialogMotion(form.current, done ? onSaved : onClose);
  }, [closing, done, onSaved, onClose]);
  const patch = metadataPatch(metadataValues(base), values),
    dirty = Object.keys(patch).length > 0;
  const set = <K extends keyof MetadataValues>(
    key: K,
    value: MetadataValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));
  const close = () => {
    if (!action.busy) setClosing(true);
  };
  const reload = () =>
    action.run(async (signal) => {
      const { data } = await readDraft(baseUrl, { id: item.id }, csrfToken, {
        signal,
      });
      if (signal.aborted) return;
      const fresh = {
        ...base,
        ...data,
        categories: data.settings?.categories ?? [],
        tags: data.settings?.tags ?? [],
        pinned: data.settings?.pinned ?? false,
        comments_open: data.settings?.comments_open ?? true,
      };
      const next = metadataValues(fresh);
      for (const key of Object.keys(patch) as (keyof MetadataValues)[])
        Object.assign(next, { [key]: values[key] });
      setBase(fresh);
      setValues(next);
    }, "已读取最新版本并保留你的修改，请核对后保存。");
  const save = async () => {
    const input = {
      action: "edit" as const,
      items: [
        {
          id: base.id,
          expected_revision: base.revision,
          expected_seq: base.collaboration_seq,
        },
      ],
      patch,
    };
    if (
      await action.run(async (signal) => {
        await mutateDraftBatch(
          baseUrl,
          { ...input, operation_id: action.operation(input) },
          csrfToken,
          { signal },
        );
      }, "")
    ) {
      setDone(true);
      setClosing(true);
    }
  };
  return (
    <div role="row">
      <div role="cell" aria-colspan={7}>
        <Form
          ref={form}
          className={styles.quick}
          data-state={closing ? "closing" : "open"}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
        >
          <div className={styles.quickHeading}>
            <h3>
              <UiText text="快速编辑" />
            </h3>
            <span>
              {item.language} ·{" "}
              <UiText text="仅保存工作稿，不改变前台已发布版本。" />
            </span>
          </div>
          <fieldset
            disabled={action.busy || closing}
            className={styles.quickFields}
          >
            <FormField id={`${id}-title`} label="标题">
              <TextField
                id={`${id}-title`}
                required={type.title_required}
                maxLength={200}
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </FormField>
            {type.supports_excerpt && (
              <FormField id={`${id}-excerpt`} label="摘要">
                <TextArea
                  id={`${id}-excerpt`}
                  rows={3}
                  maxLength={1000}
                  value={values.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                />
              </FormField>
            )}
            <div className={styles.metadataGrid}>
              {(["categories", "tags"] as const).map((key) => (
                <TokenField
                  key={key}
                  label={t(key === "categories" ? "分类" : "标签")}
                  value={values[key]}
                  onChange={(value) => set(key, value)}
                  multiple
                  suggestions={terms
                    .filter(
                      (term) =>
                        term.kind ===
                        (key === "categories" ? "category" : "tag"),
                    )
                    .map((term) => term.name)}
                />
              ))}
            </div>
            <div className={styles.switches}>
              {(["pinned", "comments_open"] as const).map((key) => (
                <label key={key}>
                  <UiText text={key === "pinned" ? "置顶" : "允许评论"} />
                  <Switch
                    aria-label={t(key === "pinned" ? "置顶" : "允许评论")}
                    checked={values[key]}
                    onCheckedChange={(value) => set(key, value)}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          {action.message && (
            <p className={styles.error} role="status">
              <UiText text={action.message} />
            </p>
          )}
          <footer className={styles.quickFooter}>
            <AdminActionButton
              icon="close"
              disabled={action.busy}
              onClick={close}
            >
              <UiText text="取消" />
            </AdminActionButton>
            {action.message && (
              <AdminActionButton
                icon="refresh"
                disabled={action.busy}
                onClick={() => void reload()}
              >
                <UiText text="读取最新版本并保留修改" />
              </AdminActionButton>
            )}
            <AdminActionButton
              type="submit"
              icon="save"
              tone="accent"
              disabled={action.busy || !dirty || closing}
            >
              <UiText text={action.busy ? "正在保存…" : "保存到草稿"} />
            </AdminActionButton>
          </footer>
        </Form>
      </div>
    </div>
  );
}
