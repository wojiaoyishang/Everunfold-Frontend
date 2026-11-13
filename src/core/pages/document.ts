import type { PageValue } from "@/core/contracts/pages";
import { digest } from "lib0/hash/sha256";
type PageSource = Pick<
  PageValue,
  "html" | "css" | "javascript" | "javascript_enabled" | "javascript_position"
> &
  Partial<Pick<PageValue, "show_image_viewer">>;
export function pageRenderId(frame: string, value: PageSource): string {
  const { html, css, javascript, javascript_enabled, show_image_viewer } =
    value;
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
            show_image_viewer,
            javascript_position: value.javascript_position ?? "body_end",
          }),
        ),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("")
  );
}
export const pageResizeScript =
  "(()=>{let previous=0;const root=document.documentElement,renderId=root.dataset.everunfoldRender,viewer=root.dataset.imageViewer==='true';const send=(force=false)=>{const height=Math.ceil(root.getBoundingClientRect().height);if(force||height!==previous){previous=height;parent.postMessage({type:'everunfold:page:size',height,renderId},'*')}};new ResizeObserver(()=>send()).observe(root);const loaded=()=>Promise.resolve(document.fonts?.ready).then(()=>{send(true);parent.postMessage({type:'everunfold:page:loaded',renderId},'*')});addEventListener('load',loaded);if(viewer)addEventListener('click',event=>{const image=event.target instanceof Element?event.target.closest('img[src]'):null;if(!image||image.closest('button')||image.hasAttribute('data-no-image-viewer'))return;event.preventDefault();event.stopPropagation();const images=[...document.querySelectorAll('img[src]')].filter(item=>!item.closest('button')&&!item.hasAttribute('data-no-image-viewer')),index=images.indexOf(image),items=images.map(item=>({src:item.currentSrc||item.src,caption:item.closest('figure')?.querySelector('figcaption')?.textContent||item.alt||''}));parent.postMessage({type:'everunfold:page:image',renderId,index,items},'*')},true);addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='everunfold:page:measure'){send(true);parent.postMessage({type:'everunfold:page:ready',renderId},'*');if(document.readyState==='complete')loaded()}});send(true);requestAnimationFrame(()=>requestAnimationFrame(()=>parent.postMessage({type:'everunfold:page:ready',renderId},'*')))})()";
export const pageResizeHash =
  "sha256-IBbYVqsQDsro9joNhNZ6raYwTCa5k85z/K1AnppTvQ4=";
const regionScript =
  "addEventListener('click',event=>{const control=event.target instanceof Element?event.target.closest('button[data-page-region]'):null;if(!control)return;parent.postMessage({type:'everunfold:page:region',renderId:document.documentElement.dataset.everunfoldRender,id:control.dataset.pageRegion},'*')})";
const regionScriptHash = "sha256-GY6OOMhMNkxuFCzJlWWN7NBsc8xLeKYOORYyGvcgdmI=";
const regionMarker =
  /{{< (reply-only|password-area) region="([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})" >}}{{< \/\1 >}}/g;

export function pageRegions(html: string) {
  return new Map(
    [...html.matchAll(regionMarker)].map((match) => [
      match[2],
      match[1] as "reply-only" | "password-area",
    ]),
  );
}
const attribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
/** User source stays inside an opaque-origin document, with an independently enforced script policy. */
export function pageDocument(value: PageSource, renderId = ""): string {
  const html = (value.html ?? "").replace(
    regionMarker,
    (_, kind: string, id: string) =>
      `<p><button type="button" data-page-region="${id}">${kind === "reply-only" ? "回复可见区域" : "解锁密码区域"}</button></p>`,
  );
  const policy = `default-src 'none'; img-src http: https: data:; media-src http: https: data:; style-src 'unsafe-inline'; font-src http: https: data:; script-src ${value.javascript_enabled ? "'unsafe-inline'" : `'${pageResizeHash}' '${regionScriptHash}'`}; script-src-attr ${value.javascript_enabled ? "'unsafe-inline'" : "'none'"}; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';`;
  const css = (value.css ?? "").replace(/<\/style/gi, "<\\/style");
  const script = (value.javascript ?? "").replace(/<\/script/gi, "<\\/script");
  const authoredScript = value.javascript_enabled
    ? `<script>${script}</script>`
    : "";
  const beforeBody = value.javascript_position === "head";
  return `<!doctype html><html data-everunfold-render="${attribute(renderId)}" data-image-viewer="${value.show_image_viewer === false ? "false" : "true"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${attribute(policy)}"><style>html{box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}body{margin:0;padding:24px;font:16px/1.8 system-ui,sans-serif;overflow-wrap:anywhere}img,video{max-width:100%;height:auto}html[data-image-viewer="true"] img{cursor:zoom-in}${css}</style>${beforeBody ? authoredScript : ""}</head><body>${html}<script>${pageResizeScript}</script>${html.includes("data-page-region=") ? `<script>${regionScript}</script>` : ""}${beforeBody ? "" : authoredScript}</body></html>`;
}
