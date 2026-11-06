import type { PageValue } from "@/generated/pages-contract";
export const pageResizeScript =
  "(()=>{let previous=0;const send=(force=false)=>{const height=Math.ceil(document.documentElement.getBoundingClientRect().height);if(force||height!==previous){previous=height;parent.postMessage({type:'everunfold:page:size',height},'*')}};new ResizeObserver(()=>send()).observe(document.documentElement);addEventListener('load',()=>send(true));addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='everunfold:page:measure')send(true)});send(true)})()";
export const pageResizeHash =
  "sha256-HhipsHJ+B9WUrfwxQXd95M5Rof0dEl6MTMOOLiNtJJY=";
const attribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
/** User source stays inside an opaque-origin document, with an independently enforced script policy. */
export function pageDocument(
  value: Pick<PageValue, "html" | "css" | "javascript" | "javascript_enabled">,
): string {
  const policy = `default-src 'none'; img-src http: https: data:; media-src http: https: data:; style-src 'unsafe-inline'; font-src http: https: data:; script-src ${value.javascript_enabled ? "'unsafe-inline'" : `'${pageResizeHash}'`}; script-src-attr ${value.javascript_enabled ? "'unsafe-inline'" : "'none'"}; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';`;
  const css = (value.css ?? "").replace(/<\/style/gi, "<\\/style");
  const script = (value.javascript ?? "").replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${attribute(policy)}"><style>html{box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}body{margin:0;padding:24px;font:16px/1.8 system-ui,sans-serif;overflow-wrap:anywhere}img,video{max-width:100%;height:auto}${css}</style></head><body>${value.html ?? ""}<script>${pageResizeScript}</script>${value.javascript_enabled ? `<script>${script}</script>` : ""}</body></html>`;
}
