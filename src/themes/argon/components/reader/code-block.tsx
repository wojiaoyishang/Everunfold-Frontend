import { frameCodeHtml } from "@/core/rendering/features/code-frame";
import { codeHtml } from "@/core/rendering/features/code-options";
import { ContentMarkup } from "../content-markup";
export function CodeBlock({
  code,
  language = "plaintext",
}: {
  code: string;
  language?: string;
}) {
  return (
    <ContentMarkup
      html={frameCodeHtml(codeHtml(code, language))}
      features={{ code: true, math: false }}
    />
  );
}
