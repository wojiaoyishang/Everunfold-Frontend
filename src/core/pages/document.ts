import type { PageValue } from "@/core/contracts/pages";
import { digest } from "lib0/hash/sha256";
type PageSource = Pick<
  PageValue,
  "html" | "css" | "javascript" | "javascript_enabled" | "javascript_position"
>;
export function pageRenderId(frame: string, value: PageSource): string {
  const { html, css, javascript, javascript_enabled } = value;
  return (
    frame +
    ":" +
    Array.from(
      digest(
        new TextEncoder().encode(
          JSON.stringify({
            html,
            css,
            javascript,
            javascript_enabled,
            javascript_position: value.javascript_position ?? "body_end",
          }),
        ),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("")
  );
}
export const pageResizeScript =
  "(()=>{let previous=0;const renderId=document.documentElement.dataset.everunfoldRender;const send=(force=false)=>{const height=Math.ceil(document.documentElement.getBoundingClientRect().height);if(force||height!==previous){previous=height;parent.postMessage({type:'everunfold:page:size',height,renderId},'*')}};new ResizeObserver(()=>send()).observe(document.documentElement);addEventListener('load',()=>send(true));addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='everunfold:page:measure'){send(true);parent.postMessage({type:'everunfold:page:ready',renderId},'*')}});send(true);requestAnimationFrame(()=>requestAnimationFrame(()=>parent.postMessage({type:'everunfold:page:ready',renderId},'*')))})()";
export const pageResizeHash =
  "sha256-sB9K6WL4wfwDLc18Yc2z3dsrlJ7ZjgnAtjMkxRgRxMA=";
const attribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
/** User source stays inside an opaque-origin document, with an independently enforced script policy. */
export function pageDocument(value: PageSource, renderId = ""): string {
  const policy = `default-src 'none'; img-src http: https: data:; media-src http: https: data:; style-src 'unsafe-inline'; font-src http: https: data:; script-src ${value.javascript_enabled ? "'unsafe-inline'" : `'${pageResizeHash}'`}; script-src-attr ${value.javascript_enabled ? "'unsafe-inline'" : "'none'"}; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';`;
  const css = (value.css ?? "").replace(/<\/style/gi, "<\\/style");
  const script = (value.javascript ?? "").replace(/<\/script/gi, "<\\/script");
  const authoredScript = value.javascript_enabled
    ? `<script>${script}</script>`
    : "";
  const beforeBody = value.javascript_position === "head";
  return `<!doctype html><html data-everunfold-render="${attribute(renderId)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${attribute(policy)}"><style>html{box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}body{margin:0;padding:24px;font:16px/1.8 system-ui,sans-serif;overflow-wrap:anywhere}img,video{max-width:100%;height:auto}${css}</style>${beforeBody ? authoredScript : ""}</head><body>${value.html ?? ""}<script>${pageResizeScript}</script>${beforeBody ? "" : authoredScript}</body></html>`;
}
