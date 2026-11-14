"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { MediaItem } from "@/core/contracts/settings";
import { useAdminSeo } from "@/core/admin/seo-context";
import { mediaReferenceId } from "@/core/media/references";
import { normalizePath, resourceUrl } from "@/core/content/urls";
import { UiText, useT } from "@/core/i18n/provider";
import {
  resolveSeo,
  seoSite,
  seoTypes,
  type SeoFields,
  type SeoInput,
} from "@/core/seo/metadata";
import {
  canonicalPath,
  seoAlternates,
  seoRouteFor,
  type SeoRoute,
} from "@/core/seo/routes";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
import { MediaPickerDialog } from "../media/media-picker-dialog";
import { MediaPreview } from "../media/media-preview";
import styles from "./seo-fields.module.css";
import { AuthoringField } from "./authoring-field";
import type { AdminFormFieldContext } from "@/core/forms/admin-field-types";

export function SeoDisclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.disclosure}>
      <Button
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <UiText text={label} />
        <Icon name="chevron" />
      </Button>
      <div id={id} data-open={open} inert={!open} className={styles.reveal}>
        <div>
          <div className={styles.revealBody}>{children}</div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  authoring?: Pick<AdminFormFieldContext, "scene" | "source" | "resourceKey">;
  value: SeoFields;
  onChange: (patch: Partial<SeoFields>) => void;
  content: SeoInput & { id?: string; published?: boolean };
  disabled?: boolean;
  onMedia?: (item: MediaItem) => void;
};

export function SeoFieldsEditor({
  authoring,
  value,
  onChange,
  content,
  disabled,
  onMedia,
}: Props) {
  const t = useT();
  const id = useId();
  const context = useAdminSeo();
  const [picker, setPicker] = useState(false);
  const [selection, setSelection] = useState<{ id: string; url: string }>();
  const site =
    context?.site ?? seoSite({ name: "Everunfold", description: "" });
  const origin = context?.origin;
  const language = content.language || site.defaultLanguage;
  const routes = new Map(
    (context?.routes ?? []).map((route) => [normalizePath(route.path), route]),
  );
  const current = content.id && seoRouteFor(routes, content.id, language);
  const path =
    current && current.sourcePath === content.path
      ? current.path
      : content.path;
  const candidate: SeoRoute | undefined = path
    ? {
        id: content.id ?? path,
        path,
        language,
        group: current ? current.group : undefined,
        eligible:
          site.indexable &&
          content.indexable !== false &&
          value.allow_indexing !== false &&
          (!content.access || content.access === "public"),
        canonical: value.seo_canonical_path,
      }
    : undefined;
  const canonical = candidate ? canonicalPath(candidate, routes) : undefined;
  const shareImage =
    selection?.id === value.share_image_media_id
      ? selection?.url
      : content.share_image_url;
  const preview = resolveSeo(
    {
      ...content,
      ...value,
      path,
      language,
      canonical,
      languages: candidate
        ? seoAlternates(
            candidate,
            new Map([...routes, [normalizePath(candidate.path), candidate]]),
          )
        : undefined,
      share_image_url: shareImage,
    },
    site,
    origin,
  );
  const canonicalTargets = [...routes.values()].filter(
    (route) =>
      route.eligible &&
      route.language === language &&
      route.id !== content.id &&
      canonicalPath(route, routes) === route.path &&
      (!route.canonical ||
        normalizePath(route.canonical) === normalizePath(route.path)),
  );
  const canonicalOptions = [
    { value: "", label: t("使用发布地址") },
    ...canonicalTargets.map((route) => ({
      value: route.path,
      label: route.path,
    })),
  ];
  if (
    value.seo_canonical_path &&
    !canonicalOptions.some(
      (option) => option.value === value.seo_canonical_path,
    )
  )
    canonicalOptions.push({
      value: value.seo_canonical_path,
      label: value.seo_canonical_path,
    });
  const indexed = !content.published
    ? "等待发布"
    : !site.indexable
      ? "全站已关闭收录"
      : content.access && content.access !== "public"
        ? "正文访问受限"
        : !preview.canIndex
          ? "不收录"
          : canonical !== path
            ? "规范网址指向其他页面"
            : "允许收录";
  const text = (
    field:
      | "seo_title"
      | "seo_description"
      | "seo_share_title"
      | "seo_share_description"
      | "seo_image_alt",
    label: string,
    maxLength: number,
    placeholder?: string,
    multiline = false,
  ) => {
    return (
      <AuthoringField
        binding={
          authoring && field !== "seo_image_alt"
            ? { ...authoring, field }
            : undefined
        }
        label={label}
        maxLength={maxLength}
        disabled={disabled}
        value={value[field] ?? ""}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        onChange={(next) => onChange({ [field]: next })}
      />
    );
  };
  return (
    <div className={styles.fields}>
      {text("seo_title", "搜索标题", 200, content.title || t("使用内容标题"))}
      {text(
        "seo_description",
        "搜索描述",
        500,
        content.summary?.trim() || t("使用内容摘要"),
        true,
      )}
      <div className="admin-field">
        <label htmlFor={id + "index"}>
          <UiText text="搜索收录" />
        </label>
        <Select
          id={id + "index"}
          name="seo-index"
          label="搜索收录"
          programOptions
          disabled={disabled}
          value={value.allow_indexing === false ? "noindex" : "inherit"}
          options={[
            { value: "inherit", label: "继承站点设置" },
            { value: "noindex", label: "不收录" },
          ]}
          onValueChange={(choice) =>
            onChange({ allow_indexing: choice !== "noindex" })
          }
        />
        <small>
          <UiText text={indexed} />
        </small>
      </div>
      <div className="admin-field">
        <span>
          <UiText text="分享图片" />
        </span>
        <div className={styles.media}>
          {shareImage && (
            <MediaPreview url={shareImage} kind="image" label={t("分享图片")} />
          )}
          <Button
            className="admin-button"
            disabled={disabled}
            onClick={() => setPicker(true)}
          >
            <Icon name="image" />
            <UiText
              text={
                value.share_image_media_id ? "更换分享图片" : "选择分享图片"
              }
            />
          </Button>
          {value.share_image_media_id && (
            <Button
              className="admin-icon-button"
              aria-label={t("移除分享图片")}
              title={t("移除分享图片")}
              disabled={disabled}
              onClick={() => onChange({ share_image_media_id: null })}
            >
              <Icon name="trash" />
            </Button>
          )}
        </div>
      </div>
      <SeoDisclosure label="高级 SEO">
        {text(
          "seo_share_title",
          "分享标题",
          200,
          value.seo_title?.trim() || content.title,
        )}
        {text(
          "seo_share_description",
          "分享描述",
          500,
          preview.description,
          true,
        )}
        {text("seo_image_alt", "分享图片替代文字", 500)}
        <div className="admin-field">
          <label htmlFor={id + "canonical"}>
            <UiText text="规范网址" />
          </label>
          <Select
            id={id + "canonical"}
            name="seo-canonical"
            label="规范网址"
            disabled={disabled}
            value={value.seo_canonical_path ?? ""}
            options={canonicalOptions}
            onValueChange={(seo_canonical_path) =>
              onChange({ seo_canonical_path })
            }
          />
          {value.seo_canonical_path &&
            normalizePath(value.seo_canonical_path) !==
              normalizePath(canonical ?? "") && (
              <small>
                <UiText text="所选规范网址当前不可用，使用发布地址。" />
              </small>
            )}
        </div>
        <div className="admin-field">
          <label htmlFor={id + "snippet"}>
            <UiText text="搜索摘要长度上限" />
          </label>
          <TextField
            id={id + "snippet"}
            type="number"
            min={0}
            max={5000}
            step={1}
            disabled={disabled}
            placeholder={t("由搜索引擎决定")}
            value={value.seo_max_snippet ?? ""}
            onChange={(event) => {
              const input = event.target.value;
              const n = Number(input);
              if (!input || (Number.isInteger(n) && n >= 0 && n <= 5000))
                onChange({ seo_max_snippet: input ? n : null });
            }}
          />
          <small>
            <UiText text="设为 0 时隐藏搜索摘要。" />
          </small>
        </div>
        <div className="admin-field">
          <label htmlFor={id + "image"}>
            <UiText text="搜索图片预览尺寸" />
          </label>
          <Select
            id={id + "image"}
            name="seo-image-size"
            label="搜索图片预览尺寸"
            programOptions
            disabled={disabled}
            value={value.seo_image_preview ?? ""}
            options={[
              { value: "", label: "由搜索引擎决定" },
              { value: "large", label: "大图" },
              { value: "standard", label: "标准" },
              { value: "none", label: "隐藏图片预览" },
            ]}
            onValueChange={(size) => {
              if (
                size === "large" ||
                size === "standard" ||
                size === "none" ||
                size === ""
              )
                onChange({ seo_image_preview: size === "" ? null : size });
            }}
          />
        </div>
        <div className="admin-field">
          <label htmlFor={id + "schema"}>
            <UiText text="结构化数据" />
          </label>
          <Select
            id={id + "schema"}
            name="seo-schema"
            label="结构化数据"
            programOptions
            disabled={disabled}
            value={value.seo_structured_data === false ? "off" : "inherit"}
            options={[
              { value: "inherit", label: "继承站点设置" },
              { value: "off", label: "关闭" },
            ]}
            onValueChange={(choice) =>
              onChange({ seo_structured_data: choice === "off" ? false : null })
            }
          />
          <small>{seoTypes[content.kind]}</small>
        </div>
      </SeoDisclosure>
      <SeoDisclosure label="预览搜索与分享">
        <div className={styles.card}>
          <span>
            <UiText text="搜索结果示意" />
          </span>
          <strong>{preview.formattedTitle}</strong>
          {preview.canonical && <small>{preview.canonical}</small>}
          {preview.description && <p>{preview.description}</p>}
        </div>
        <div className={styles.card}>
          <span>
            <UiText text="分享卡片" />
          </span>
          {preview.image && resourceUrl(preview.image) && (
            <MediaPreview
              url={preview.image}
              kind="image"
              label={preview.imageAlt || t("分享图片")}
            />
          )}
          <strong>{preview.shareTitle}</strong>
          {preview.shareDescription && <p>{preview.shareDescription}</p>}
        </div>
        <small>
          <UiText
            text={
              value.seo_title?.trim()
                ? "搜索标题来自手动设置。"
                : "搜索标题来自内容标题和站点格式。"
            }
          />{" "}
          <UiText
            text={
              value.seo_share_title?.trim()
                ? "分享标题来自手动设置。"
                : "分享标题继承搜索标题。"
            }
          />
        </small>
      </SeoDisclosure>
      {picker && (
        <MediaPickerDialog
          kind="image"
          title="选择分享图片"
          confirmLabel="使用此图片"
          onClose={() => setPicker(false)}
          onPick={(item) => {
            if (disabled) return;
            const imageId = mediaReferenceId(item.id);
            setSelection({ id: imageId, url: item.url });
            onMedia?.(item);
            onChange({ share_image_media_id: imageId });
          }}
        />
      )}
    </div>
  );
}
