/** Shared copy for the pre-render HTTP gate and React error boundaries. */
export function failurePage(status: 404 | 503) {
  return status === 404
    ? {
        code: "404",
        title: "页面未找到",
        description: "请检查访问地址，或返回首页查看其他内容。",
      }
    : {
        code: "503",
        title: "页面加载失败",
        description: "后端同步失败，暂时无法读取这页内容。请稍后重试。",
      };
}

/** Standalone fallback must work without the snapshot, JavaScript, or any remote asset. */
export function failureDocument(status: 404 | 503) {
  const page = failurePage(status);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${page.code} ${page.title} · Everunfold</title><style>
:root{color-scheme:light dark;--bg:#f7f7f8;--fg:#242428;--muted:#66666e;--line:#dedee2}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 system-ui,sans-serif;min-height:100svh;display:grid;place-items:center}main{width:min(540px,100%);padding:40px 28px}.brand{font-size:12px;letter-spacing:.12em;color:var(--muted);padding-bottom:22px;border-bottom:1px solid var(--line)}.code{margin:32px 0 0;font-size:72px;line-height:1.15;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.04em}h1{font-size:24px;margin:12px 0}p{color:var(--muted)}a{display:inline-block;margin-top:16px;padding:9px 17px;border:1px solid var(--line);border-radius:7px;color:var(--fg);text-decoration:none}a:hover{background:var(--line)}a:focus-visible{outline:2px solid currentColor;outline-offset:4px}@media(prefers-color-scheme:dark){:root{--bg:#19191c;--fg:#ededf0;--muted:#aaaab3;--line:#3b3b42}}
</style></head><body><main><div class="brand">EVERUNFOLD</div><p class="code">${page.code}</p><h1>${page.title}</h1><p>${page.description}</p><a href="/">返回首页</a></main></body></html>`;
}
