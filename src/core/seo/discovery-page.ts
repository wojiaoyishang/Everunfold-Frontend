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
      kicker: "sitemap",
      title: "站点地图",
      description:
        "公开可访问的页面、文章与说说。机器请求仍读取同一地址的标准 XML。",
      collection: "公开地址",
      empty: "当前没有可公开列出的地址。",
    },
    rss: {
      kicker: "feed",
      title: "RSS 订阅",
      description:
        "最近发布的公开内容。RSS 阅读器会读取同一地址的标准 RSS 2.0 XML。",
      collection: "最近更新",
      empty: "当前没有可订阅的公开内容。",
    },
    atom: {
      kicker: "feed",
      title: "Atom 订阅",
      description:
        "最近发布的公开内容。Atom 阅读器会读取同一地址的标准 Atom XML。",
      collection: "最近更新",
      empty: "当前没有可订阅的公开内容。",
    },
  }[input.kind];
  const items = input.items.slice(0, 100);
  const rows = items
    .map(
      (item, index) => `
        <li class="entry">
          <span class="line">${String(index + 1).padStart(3, "0")}</span>
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
          <span class="entry-open" aria-hidden="true">open</span>
        </li>`,
    )
    .join("");
  const languageQuery = input.language
    ? `?language=${encodeURIComponent(input.language)}`
    : "";
  const tabs = [
    { kind: "sitemap", file: "sitemap.xml", href: "/sitemap.xml" },
    {
      kind: "rss",
      file: "feed.xml",
      href: `/feed.xml${languageQuery}`,
    },
    {
      kind: "atom",
      file: "atom.xml",
      href: `/atom.xml${languageQuery}`,
    },
  ] as const;
  const rawPath = input.rawHref.split("?", 1)[0];
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <meta name="description" content="${escapeHtml(input.siteDescription)}">
  <title>${escapeHtml(meta.title)} · ${escapeHtml(input.siteName)}</title>
  <style>
    :root{color-scheme:light dark;--canvas:#eef0f3;--panel:#fff;--panel-soft:#f6f7f9;--text:#20252b;--muted:#68717d;--line:#d8dde4;--rule:#e7eaee;--accent:#3154d9;--accent-soft:#eef2ff;--ok:#238636}
    *{box-sizing:border-box}html,body{min-height:100%}body{margin:0;background:var(--canvas);color:var(--text);font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono","Microsoft YaHei",monospace}
    a{color:inherit;text-decoration:none}code{font:inherit}.appbar{border-bottom:1px solid var(--line);background:var(--panel)}.appbar-inner{display:flex;width:min(1080px,calc(100% - 32px));min-height:46px;margin:0 auto;align-items:center;justify-content:space-between;gap:24px}
    .brand{display:flex;min-width:0;align-items:center;gap:8px}.brand-mark{display:grid;width:22px;height:22px;place-items:center;border:1px solid var(--line);border-radius:4px;color:var(--accent);font-size:10px;font-weight:700}.brand-site{color:var(--text);font-weight:600}.brand-separator{color:var(--muted)}.brand-file{overflow:hidden;color:var(--muted);text-overflow:ellipsis;white-space:nowrap}
    .top-actions{display:flex;flex:0 0 auto;align-items:center;gap:14px;font-size:11px}.top-actions a{color:var(--muted)}.top-actions a:hover{color:var(--accent)}
    .shell{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px}.tabs{display:flex;gap:0;border:1px solid var(--line);border-bottom:0;border-radius:5px 5px 0 0;overflow:auto;background:var(--panel-soft)}.tab{display:flex;min-height:39px;flex:0 0 auto;align-items:center;gap:7px;padding:0 15px;border-right:1px solid var(--line);color:var(--muted);font-size:11px}.tab:hover{color:var(--text);background:color-mix(in srgb,var(--panel) 82%,var(--panel-soft))}.tab[data-active]{color:var(--text);background:var(--panel);box-shadow:inset 0 2px 0 var(--accent)}.tab-dot{width:6px;height:6px;border-radius:50%;background:#d29922}.tab[data-active] .tab-dot{background:var(--accent)}
    .pane{border:1px solid var(--line);border-radius:0 0 5px 5px;background:var(--panel);overflow:hidden}.pane-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:20px 22px 17px}.eyebrow{margin:0 0 5px;color:var(--accent);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.pane h1{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;font-size:20px;line-height:1.35;letter-spacing:-.01em}.pane-head p:last-child{max-width:720px;margin:7px 0 0;color:var(--muted);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;font-size:12px;line-height:1.7}.buttons{display:flex;gap:8px}.button{display:inline-flex;min-height:32px;align-items:center;padding:5px 10px;border:1px solid var(--line);border-radius:4px;background:var(--panel-soft);color:var(--text);font-size:10px;white-space:nowrap}.button:hover{border-color:var(--accent);color:var(--accent)}.button[data-primary]{border-color:var(--accent);background:var(--accent);color:#fff}
    .meta-bar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);background:var(--panel-soft)}.meta-item{display:flex;min-width:0;align-items:center;justify-content:space-between;gap:10px;padding:8px 13px;border-right:1px solid var(--rule)}.meta-item:last-child{border-right:0}.meta-item span{overflow:hidden;color:var(--muted);font-size:9px;text-transform:uppercase;text-overflow:ellipsis;white-space:nowrap}.meta-item strong{overflow:hidden;font-size:10px;font-weight:600;text-align:right;text-overflow:ellipsis;white-space:nowrap}
    .file-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:10px 18px;border-bottom:1px solid var(--rule);color:var(--muted);font-size:10px}.file-head strong{color:var(--text);font-size:11px;font-weight:600}.file-head code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .entries{margin:0;padding:0;list-style:none}.entry{display:grid;grid-template-columns:42px minmax(0,1fr) 36px;gap:0;align-items:stretch;border-bottom:1px solid var(--rule)}.entry:last-child{border-bottom:0}.entry:hover{background:var(--panel-soft)}.line{display:flex;align-items:flex-start;justify-content:flex-end;padding:12px 10px 12px 0;color:color-mix(in srgb,var(--muted) 70%,transparent);font-size:9px;user-select:none}.entry-body{min-width:0;padding:11px 14px 11px 0}.entry-title{display:block;overflow-wrap:anywhere;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;font-size:13px;font-weight:600;line-height:1.5}.entry-title:hover{color:var(--accent)}.entry-body p{display:-webkit-box;margin:4px 0 0;overflow:hidden;color:var(--muted);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;font-size:11px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}.entry-meta{display:flex;flex-wrap:wrap;gap:5px 10px;margin-top:6px;color:var(--muted);font-size:9px}.entry-meta span:not(:first-child):before{content:"#";color:var(--accent);margin-right:2px}.entry-open{display:flex;align-items:flex-start;justify-content:center;padding-top:13px;color:var(--muted);font-size:8px;text-transform:uppercase}.entry:hover .entry-open{color:var(--accent)}.empty{padding:42px 20px;color:var(--muted);text-align:center}
    .statusbar{display:flex;min-height:29px;align-items:center;gap:15px;padding:0 13px;border-top:1px solid var(--line);background:var(--panel-soft);color:var(--muted);font-size:9px}.statusbar .ready{display:flex;align-items:center;gap:5px;color:var(--text)}.statusbar .ready:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ok)}.statusbar .push{margin-left:auto}
    @media(max-width:680px){.appbar-inner,.shell{width:100%}.appbar-inner{padding:0 12px}.brand-site,.brand-separator{display:none}.top-actions{gap:10px}.shell{padding:0 0 32px}.tabs{border-radius:0;border-left:0;border-right:0}.pane{border-left:0;border-right:0;border-radius:0}.pane-head{padding:17px 14px 14px;flex-direction:column;gap:13px}.buttons{width:100%}.button{flex:1;justify-content:center}.meta-bar{grid-template-columns:repeat(2,minmax(0,1fr))}.meta-item:nth-child(2){border-right:0}.meta-item:nth-child(-n+2){border-bottom:1px solid var(--rule)}.file-head{padding:9px 12px}.entry{grid-template-columns:32px minmax(0,1fr)}.line{padding-right:8px}.entry-body{padding-right:12px}.entry-open{display:none}.statusbar .push{display:none}}
    @media(prefers-color-scheme:dark){:root{--canvas:#1e1e1e;--panel:#252526;--panel-soft:#2d2d30;--text:#d4d4d4;--muted:#9da3ab;--line:#3e3e42;--rule:#333337;--accent:#75beff;--accent-soft:#26384a;--ok:#89d185}}
  </style>
</head>
<body>
  <header class="appbar">
    <div class="appbar-inner">
      <a class="brand" href="/"><span class="brand-mark">E</span><span class="brand-site">${escapeHtml(input.siteName)}</span><span class="brand-separator">/</span><span class="brand-file">${escapeHtml(rawPath.replace(/^[/]/, ""))}</span></a>
      <nav class="top-actions" aria-label="站点与原始文件"><a href="/">站点</a><a href="${escapeHtml(input.rawHref)}">原始 XML</a></nav>
    </div>
  </header>
  <main class="shell">
    <nav class="tabs" aria-label="发现文件">
      ${tabs
        .map(
          (tab) =>
            `<a class="tab" href="${escapeHtml(tab.href)}"${tab.kind === input.kind ? ' data-active="true"' : ""}><span class="tab-dot"></span>${escapeHtml(tab.file)}</a>`,
        )
        .join("")}
    </nav>
    <section class="pane">
      <header class="pane-head">
        <div><p class="eyebrow">${escapeHtml(meta.kicker)}</p><h1>${escapeHtml(meta.title)}</h1><p>${escapeHtml(meta.description)}</p></div>
        <div class="buttons"><a class="button" href="/">返回站点</a><a class="button" data-primary href="${escapeHtml(input.rawHref)}">查看原始 XML</a></div>
      </header>
      <div class="meta-bar">
        <div class="meta-item"><span>entries</span><strong>${input.items.length}</strong></div>
        <div class="meta-item"><span>language</span><strong>${escapeHtml(input.language || "all")}</strong></div>
        <div class="meta-item"><span>updated</span><strong>${escapeHtml(formattedDate(input.updatedAt) || "—")}</strong></div>
        <div class="meta-item"><span>format</span><strong>XML</strong></div>
      </div>
      <div class="file-head"><strong>${escapeHtml(meta.collection)}</strong><code>${escapeHtml(rawPath)}</code></div>
      ${rows ? `<ol class="entries">${rows}</ol>` : `<p class="empty">${escapeHtml(input.emptyMessage || meta.empty)}</p>`}
      <footer class="statusbar"><span class="ready">XML ready</span><span>UTF-8</span><span>noindex</span><span class="push">crawlers receive standard XML</span></footer>
    </section>
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
