import {
  featureAssets,
  type ContentFeatures,
} from "@/core/rendering/features/model";

/** Deliberately not imported by layouts: only the current rendered body declares its assets. */
export function ContentResources({ features }: { features: ContentFeatures }) {
  return (
    <>
      {features.code && (
        <link
          rel="stylesheet"
          href={featureAssets.code}
          data-content-resource="code"
        />
      )}
      {features.math && (
        <link
          rel="stylesheet"
          href={featureAssets.math}
          data-content-resource="math"
        />
      )}
      {features.math && (
        <link
          rel="stylesheet"
          href={featureAssets.formula}
          data-content-resource="formula"
        />
      )}
    </>
  );
}
