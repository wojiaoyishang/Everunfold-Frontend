import { failurePage } from "@/core/navigation/failure-page";
import generated from "@/core/build/failure-pages";

/** Self-contained HTML: still usable with no snapshot, JavaScript, chunks or remote assets. */
export function failureDocument(status: 404 | 503) {
  const page = failurePage(status);
  // Build-time rendering keeps React's server renderer out of the request interception layer.
  return `<!doctype html><html lang="zh-CN" data-failure-document><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${page.code} ${page.title} · Everunfold</title><style>${generated.styles}</style><script>${generated.appearance}</script></head><body><main>${generated.pages[status]}</main><script type="module">${generated.game}</script></body></html>`;
}
