import type { CodePreferences } from "@/core/contracts/settings";
import type { ContentFeatures } from "@/core/rendering/features/model";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";
import { ContentResources } from "./content-resources";
import { codeFontFace, codePreferenceStyle } from "./code-preferences-model";
import { ContentMarkupEnhancer } from "./content-markup-enhancer";

/**
 * Emit the article body directly in the server response, then attach only the
 * interactive enhancements to the already-rendered DOM.
 */
export function StaticContentMarkup({
  html,
  features,
  className = "",
  contentId,
  contentRevision,
  glossary,
  code = {},
}: {
  html: string;
  features: ContentFeatures;
  className?: string;
  contentId: string;
  contentRevision: string;
  glossary?: GlossaryRuntimeOptions;
  code?: CodePreferences;
}) {
  const targetId = `content-markup-${contentId}`;
  const font = features.code ? codeFontFace(code) : "";
  return (
    <>
      <ContentResources features={features} />
      {font && (
        <style data-code-font dangerouslySetInnerHTML={{ __html: font }} />
      )}
      <div
        id={targetId}
        className={className}
        data-content-features
        data-code-light={code.light_scheme ?? "paper"}
        data-code-dark={code.dark_scheme ?? "slate"}
        data-code-numbers={String(code.line_numbers !== false)}
        data-code-wrap-default={String(code.wrap ?? false)}
        data-glossary-enabled={Boolean(glossary?.auto_match && contentId)}
        data-glossary-loaded="false"
        style={features.code ? codePreferenceStyle(code) : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ContentMarkupEnhancer
        targetId={targetId}
        features={features}
        contentId={contentId}
        revision={contentRevision}
        glossary={glossary}
      />
    </>
  );
}
