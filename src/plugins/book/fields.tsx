"use client";

import { useEffect, useId, useState } from "react";
import type { FormFieldProps, PageCategory } from "@everunfold/plugin-sdk";
import {
  Button,
  Icon,
  MediaPickerDialog,
  Select,
  TextField,
  UiText,
  readPageCategories,
  resourceUrl,
  useAdminRequest,
  useT,
} from "@everunfold/plugin-sdk/client";
import styles from "./styles.module.css";

export function BookCategoryField({
  field,
  value,
  onChange,
  disabled,
}: FormFieldProps) {
  const { baseUrl } = useAdminRequest();
  const t = useT();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<
    { items: PageCategory[] } | "error" | null
  >(null);
  useEffect(() => {
    const controller = new AbortController();
    void readPageCategories(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult("error");
      });
    return () => controller.abort();
  }, [baseUrl, attempt]);

  const current = typeof value === "string" ? value : "";
  const categories = result && result !== "error" ? result.items : [];
  const options = [
    { value: "", label: t("选择文章分类") },
    ...categories.map(({ id, name, slug }) => ({
      value: id,
      label: name === slug ? name : `${name} · ${slug}`,
    })),
  ];
  if (current && !categories.some((item) => item.id === current))
    options.push({
      value: current,
      label: t(result && result !== "error" ? "原分类不可用" : "已选分类"),
    });

  return (
    <div className="account-field">
      <span>
        <UiText text={field.label} />
      </span>
      <Select
        name={field.key}
        label={field.label}
        options={options}
        value={current}
        disabled={disabled || result === null || result === "error"}
        onValueChange={onChange}
      />
      {result === null ? (
        <small role="status">
          <UiText text="正在读取文章分类…" />
        </small>
      ) : result === "error" ? (
        <div className={styles.fieldActions}>
          <small role="alert">
            <UiText text="文章分类暂时无法读取。" />
          </small>
          <Button
            className="admin-button"
            onClick={() => {
              setResult(null);
              setAttempt(attempt + 1);
            }}
          >
            <UiText text="重试" />
          </Button>
        </div>
      ) : !categories.length ? (
        <small>
          <UiText text="请先在分类与标签中创建文章分类。" />
        </small>
      ) : (
        <small>
          <UiText text="目录收录此分类中公开可读的文章。" />
        </small>
      )}
    </div>
  );
}

export function BookCoverField({
  field,
  value,
  onChange,
  disabled,
}: FormFieldProps) {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const current = typeof value === "string" ? value : "";
  const image = resourceUrl(current);
  return (
    <div className="account-field">
      <label htmlFor={id}>
        <UiText text={field.label} />
      </label>
      <div className={styles.fieldActions}>
        <TextField
          id={id}
          value={current}
          maxLength={2048}
          inputMode="url"
          placeholder={t("输入图片地址")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          className="admin-button"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <Icon name="image" />
          <UiText text="媒体库" />
        </Button>
      </div>
      {image && <CoverThumbnail key={image} source={image} />}
      <small>
        <UiText
          text={
            current && !image
              ? "请输入站内图片路径或 HTTP(S) 图片地址。"
              : "留空使用内置书封。"
          }
        />
      </small>
      {open && (
        <MediaPickerDialog
          title={t("选择书籍封面")}
          kind="image"
          onClose={() => setOpen(false)}
          onPick={(item) => onChange(item.url)}
        />
      )}
    </div>
  );
}

function CoverThumbnail({ source }: { source: string }) {
  const [broken, setBroken] = useState(false);
  return broken ? (
    <small>
      <UiText text="封面图片无法加载。" />
    </small>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- plugin media may use either the local library or an external image URL.
    <img
      className={styles.thumbnail}
      src={source}
      alt=""
      onError={() => setBroken(true)}
    />
  );
}
