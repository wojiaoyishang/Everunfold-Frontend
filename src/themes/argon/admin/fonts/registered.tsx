"use client";
import { useState } from "react";
import { FontStyles, useRegisteredFonts } from "@/core/fonts/provider";
import { fontStack } from "@/core/fonts";
import type { FontDefinition } from "@/core/fonts";
import { UiText } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import styles from "./fonts.module.css";

function RegisteredFontCard({
  font,
  sample,
}: {
  font: FontDefinition;
  sample: string;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <article className={styles.card} data-registered-font={font.id}>
      <div className={styles.cardHeading}>
        <div>
          <strong>{font.label}</strong>
          <small>{font.id}</small>
        </div>
        <span>
          <UiText text="代码注册" />
        </span>
      </div>
      {preview && <FontStyles ids={[font.id]} />}
      <div
        className={styles.sample}
        data-preview={preview}
        style={preview ? { fontFamily: fontStack(font) } : undefined}
      >
        {preview ? (
          sample || "Aa 0123456789"
        ) : (
          <>
            <span aria-hidden="true">Aa</span>
            <small>
              <UiText text="点击预览后加载字体" />
            </small>
          </>
        )}
      </div>
      <footer>
        <span>
          {font.faces?.length ? (
            [
              ...new Set(font.faces.map((face) => face.format.toUpperCase())),
            ].join(" / ")
          ) : (
            <UiText text="系统字体，无需下载" />
          )}
        </span>
        <Button
          className="admin-button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          <UiText text={preview ? "收起预览" : "预览字体"} />
        </Button>
      </footer>
      {font.license && <p className={styles.license}>{font.license}</p>}
    </article>
  );
}
export function RegisteredFonts({
  search,
  sample,
}: {
  search: string;
  sample: string;
}) {
  const fonts = useRegisteredFonts(),
    query = search.trim().toLocaleLowerCase();
  const shown = fonts.all.filter((font) =>
    `${font.id} ${font.label}`.toLocaleLowerCase().includes(query),
  );
  return (
    <section
      className={styles.registered}
      aria-labelledby="registered-fonts-title"
    >
      <header>
        <h2 id="registered-fonts-title">
          <UiText text="已注册字体" />
        </h2>
        <p>
          <UiText text="由主题和插件声明，按需加载。上传字体仍可在编辑器和站点设置中选择。" />
        </p>
      </header>
      <div className={styles.grid}>
        {shown.map((font) => (
          <RegisteredFontCard key={font.id} font={font} sample={sample} />
        ))}
      </div>
      {!shown.length && (
        <p>
          <UiText text="没有匹配的注册字体" />
        </p>
      )}
    </section>
  );
}
