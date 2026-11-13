"use client";

import { useState } from "react";
import { resourceUrl } from "@/core/content/urls";
import { Icon, type IconName } from "./icon";

export function SiteIcon({
  url,
  fallback,
  size,
  className,
}: {
  url?: string;
  fallback: IconName;
  size: number;
  className: string;
}) {
  const src = resourceUrl(url);
  return (
    <SiteIconImage
      key={src}
      src={src}
      fallback={fallback}
      size={size}
      className={className}
    />
  );
}

function SiteIconImage({
  src,
  fallback,
  size,
  className,
}: {
  src: string | null;
  fallback: IconName;
  size: number;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Icon name={fallback} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Site icon URLs can use any configured HTTP(S) host.
    <img
      className={className}
      src={src}
      alt=""
      width={size}
      height={size}
      decoding="async"
      referrerPolicy="no-referrer"
      ref={(image) => {
        if (image?.complete && image.naturalWidth === 0) setFailed(true);
      }}
      onError={() => setFailed(true)}
    />
  );
}
