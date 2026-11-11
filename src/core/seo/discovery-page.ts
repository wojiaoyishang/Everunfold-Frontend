export type DiscoveryPageKind = "sitemap" | "rss" | "atom";

export type DiscoveryPageItem = {
  title: string;
  href: string;
  meta?: string;
  summary?: string;
  tags?: string[];
};

type DiscoveryPageInput = {
  kind: DiscoveryPageKind;
  siteName: string;
  siteDescription: string;
  items: DiscoveryPageItem[];
  rawHref: string;
  emptyMessage: string;
  language?: string;
  updatedAt?: string;
  status?: number;
};

const CRAWLER =
  /bot|crawl|spider|slurp|archiver|feedfetcher|validator|monitor|preview|inspectiontool|google-inspectiontool/i;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formattedDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
}

/** Browsers navigating normally get a human view; feed readers and crawlers keep XML. */
export function browserDiscoveryRequested(request: Request) {
  const url = new URL(request.url);
  const forced = url.searchParams.get("format");
  if (forced === "xml") return false;
  if (forced === "html") return true;
  const userAgent = request.headers.get("user-agent") ?? "";
  if (CRAWLER.test(userAgent)) return false;
  const destination = request.headers.get("sec-fetch-dest");
  const accept = (request.headers.get("accept") ?? "").toLowerCase();
  return (
    accept.includes("text/html") && (!destination || destination === "document")
  );
}

export function renderDiscoveryPage(input: DiscoveryPageInput) {
  const meta = {
    sitemap: {
      kicker: "SITEMAP · XML",
      title: "站点地图",
      description:
        "这里集中展示可以公开访问的页面、文章和说说，方便读者浏览，也方便搜索引擎理解站点结构。",
      collection: "公开地址",
      empty: "当前没有可公开列出的地址。",
    },
    rss: {
      kicker: "SYNDICATION · RSS 2.0",
      title: "RSS 订阅",
      description:
        "通过任意 RSS 阅读器订阅本站更新。你也可以继续直接读取标准 RSS 2.0 XML。",
      collection: "最近更新",
      empty: "当前没有可订阅的公开内容。",
    },
    atom: {
      kicker: "SYNDICATION · ATOM",
      title: "Atom 订阅",
      description:
        "通过支持 Atom 的阅读器订阅本站更新。标准 Atom XML 仍在同一地址提供。",
      collection: "最近更新",
      empty: "当前没有可订阅的公开内容。",
    },
  }[input.kind];
  const items = input.items.slice(0, 100);
  const rows = items
    .map(
      (item, index) => `
        <li class="entry">
          <span class="index">${String(index + 1).padStart(2, "0")}</span>
          <div class="entry-body">
            <a class="entry-title" href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a>
            ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
            <div class="entry-meta">
              ${item.meta ? `<time>${escapeHtml(item.meta)}</time>` : ""}
              ${(item.tags ?? [])
                .map((tag) => `<span>${escapeHtml(tag)}</span>`)
                .join("")}
            </div>
          </div>
          <span class="entry-arrow" aria-hidden="true">↗</span>
        </li>`,
    )
    .join("");
  const countLabel =
    input.kind === "sitemap"
      ? `${input.items.length} 个公开地址`
      : `${input.items.length} 条公开内容`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <title>${escapeHtml(meta.title)} · ${escapeHtml(input.siteName)}</title>
  <style>
    :root{color-scheme:light dark;--bg:#f4f5f7;--paper:#fff;--text:#20242c;--muted:#6d7481;--line:#e2e5ea;--soft:#f7f8fa;--accent:#3154d9;--accent-soft:#eef2ff}
    *{box-sizing:border-box}html{background:var(--bg)}body{margin:0;color:var(--text);background:var(--bg);font:14px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}
    a{color:inherit;text-decoration:none}.shell{width:min(980px,calc(100% - 32px));margin:0 auto;padding:28px 0 56px}
    .topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:34px}.brand{display:flex;align-items:center;gap:10px;font-weight:650;letter-spacing:.01em}
    .mark{display:grid;width:30px;height:30px;place-items:center;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--accent)}
    .mark svg{width:16px;height:16px}.kind{padding:5px 9px;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.06em}
    .hero{display:grid;grid-template-columns:minmax(0,1fr) 238px;gap:34px;align-items:end;padding:36px;border:1px solid var(--line);border-radius:12px;background:var(--paper);box-shadow:0 14px 40px #1920330a}
    .kicker{margin:0 0 11px;color:var(--accent);font:650 11px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em}.hero h1{margin:0;font-size:clamp(30px,5vw,48px);line-height:1.12;letter-spacing:-.035em}.lead{max-width:640px;margin:16px 0 0;color:var(--muted);font-size:15px;line-height:1.8}
    .actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:24px}.button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:8px;padding:9px 14px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font-size:12px;font-weight:600;transition:border-color .16s,transform .16s}.button:hover{border-color:var(--accent);transform:translateY(-1px)}.button.primary{border-color:var(--accent);background:var(--accent);color:#fff}
    .summary{align-self:stretch;padding:18px;border:1px solid var(--line);border-radius:9px;background:var(--soft)}.summary strong{display:block;font-size:22px;line-height:1.3}.summary span{display:block;margin-top:4px;color:var(--muted);font-size:11px}.summary dl{display:grid;gap:9px;margin:17px 0 0;padding-top:14px;border-top:1px solid var(--line)}.summary div{display:flex;justify-content:space-between;gap:12px}.summary dt{color:var(--muted);font-size:10px}.summary dd{margin:0;font-size:11px;font-weight:600;text-align:right}
    .collection{margin-top:18px;border:1px solid var(--line);border-radius:12px;background:var(--paper);overflow:hidden}.collection-head{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:20px 22px;border-bottom:1px solid var(--line)}.collection h2{margin:0;font-size:16px;line-height:1.4}.collection-head p{margin:3px 0 0;color:var(--muted);font-size:11px}.collection-head code{color:var(--muted);font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
    .entries{margin:0;padding:0;list-style:none}.entry{display:grid;grid-template-columns:32px minmax(0,1fr) 20px;gap:13px;align-items:start;padding:17px 22px;border-bottom:1px solid var(--line)}.entry:last-child{border-bottom:0}.index{padding-top:2px;color:var(--muted);font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}.entry-body{min-width:0}.entry-title{display:block;font-size:14px;font-weight:650;overflow-wrap:anywhere}.entry-title:hover{color:var(--accent)}.entry-body p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.7}.entry-meta{display:flex;flex-wrap:wrap;gap:5px 9px;margin-top:7px;color:var(--muted);font-size:10px}.entry-meta span{padding:2px 6px;border-radius:4px;background:var(--soft)}.entry-arrow{padding-top:1px;color:var(--muted);font-size:12px}.empty{padding:44px 20px;color:var(--muted);text-align:center}
    .footer{display:flex;justify-content:space-between;gap:16px;margin-top:18px;color:var(--muted);font-size:10px}.footer a:hover{color:var(--text)}
    @media(max-width:720px){.shell{width:min(100% - 24px,980px);padding-top:18px}.topbar{margin-bottom:20px}.hero{grid-template-columns:1fr;padding:24px;gap:24px}.summary{max-width:none}.collection-head,.footer{align-items:flex-start;flex-direction:column}.entry{grid-template-columns:24px minmax(0,1fr);padding:15px 16px}.entry-arrow{display:none}}
    @media(prefers-color-scheme:dark){:root{--bg:#111318;--paper:#171a21;--text:#f1f3f7;--muted:#9aa2af;--line:#2b303a;--soft:#1d2129;--accent:#91a8ff;--accent-soft:#202944}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="/"><span class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12a7 7 0 0 1 7-7m-7 12a12 12 0 0 1 12-12M5 19h.01"/></svg></span>${escapeHtml(input.siteName)}</a>
      <span class="kind">站点发现</span>
    </header>
    <section class="hero">
      <div>
        <p class="kicker">${escapeHtml(meta.kicker)}</p>
        <h1>${escapeHtml(meta.title)}</h1>
        <p class="lead">${escapeHtml(meta.description)}</p>
        <div class="actions">
          <a class="button primary" href="${escapeHtml(input.rawHref)}">查看原始 XML <span aria-hidden="true">↗</span></a>
          <a class="button" href="/">返回站点</a>
        </div>
      </div>
      <aside class="summary">
        <strong>${input.items.length}</strong>
        <span>${escapeHtml(countLabel)}</span>
        <dl>
          <div><dt>语言</dt><dd>${escapeHtml(input.language || "全部")}</dd></div>
          <div><dt>更新</dt><dd>${escapeHtml(formattedDate(input.updatedAt) || "暂无")}</dd></div>
          <div><dt>读取方式</dt><dd>标准 XML</dd></div>
        </dl>
      </aside>
    </section>
    <section class="collection">
      <header class="collection-head">
        <div><h2>${escapeHtml(meta.collection)}</h2><p>${escapeHtml(input.siteDescription || "Everunfold 站点公开内容")}</p></div>
        <code>${escapeHtml(input.rawHref.split("?", 1)[0])}</code>
      </header>
      ${rows ? `<ol class="entries">${rows}</ol>` : `<p class="empty">${escapeHtml(input.emptyMessage || meta.empty)}</p>`}
    </section>
    <footer class="footer"><span>此页面仅供阅读，爬虫与订阅器仍会读取原始 XML。</span><a href="${escapeHtml(input.rawHref)}">XML 源文件</a></footer>
  </main>
</body>
</html>`;
}

export function discoveryPageResponse(input: DiscoveryPageInput) {
  return new Response(renderDiscoveryPage(input), {
    status: input.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      Vary: "Accept, Sec-Fetch-Dest, User-Agent",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
