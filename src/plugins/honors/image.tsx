"use client";
import { useState } from "react";
import { Icon, useLocale } from "@everunfold/plugin-sdk/client";
import { honorsText } from "./labels";
import styles from "./styles.module.css";

export function CertificateImage({
  src,
  title,
  large = false,
}: {
  src: string;
  title: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const { uiLocale } = useLocale();
  return failed ? (
    <span className={styles.imageMissing}>
      <Icon name="image" />
      {honorsText("证书暂不可用", uiLocale)}
    </span>
  ) : (
    // Certificate proportions must remain intact; these are user-managed media URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      loading={large ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
