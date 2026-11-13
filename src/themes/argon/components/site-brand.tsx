"use client";

import { useState } from "react";
import type { ThemePreferences } from "@/core/contracts/settings";
import { resourceUrl } from "@/core/content/urls";
import "./site-brand.css";

export function SiteBrand({
  name,
  heroTitle,
  theme,
}: {
  name: string;
  heroTitle?: string;
  theme?: Pick<
    ThemePreferences,
    "header_brand_text" | "header_brand_mode" | "header_logo_url"
  >;
}) {
  const text = theme?.header_brand_text?.trim() || heroTitle?.trim() || name;
  const logo =
    theme?.header_brand_mode === "text"
      ? null
      : resourceUrl(theme?.header_logo_url);
  return (
    <BrandContent
      key={logo}
      logo={logo}
      text={text}
      imageOnly={theme?.header_brand_mode === "image"}
    />
  );
}

function BrandContent({
  logo,
  text,
  imageOnly,
}: {
  logo: string | null;
  text: string;
  imageOnly: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(logo && !failed);
  return (
    <>
      {logo && showLogo && (
        // eslint-disable-next-line @next/next/no-img-element -- Keep the configured logo's intrinsic proportions.
        <img
          className="site-brand-logo"
          src={logo}
          alt=""
          height={32}
          decoding="async"
          ref={(image) => {
            if (image?.complete && image.naturalWidth === 0) setFailed(true);
          }}
          onError={() => setFailed(true)}
        />
      )}
      <span className={imageOnly && showLogo ? "sr-only" : "site-brand-text"}>
        {text}
      </span>
    </>
  );
}
