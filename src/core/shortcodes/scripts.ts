type Script = { javascript: string; title: string; css: string };

function scriptDocument(markup: string, script: Script, token: string) {
  const rootSelector = `#shortcode-${token}`;
  const css = script.css.replace(/<\/style/gi, "<\\/style");
  const source = script.javascript.replace(/<\/script/gi, "<\\/script");
  const program = `
    const rootSelector = ${JSON.stringify(rootSelector)};
    const root = document.querySelector(rootSelector);
    const report = () => parent.postMessage(
      { type: "everunfold-shortcode-size", token: ${JSON.stringify(token)}, height: root.offsetHeight },
      "*"
    );
    new ResizeObserver(report).observe(root);
    report();
    try {
      const cleanup = (function (root, rootSelector) {
        "use strict";
        ${source}
      })(root, rootSelector);
      if (typeof cleanup === "function") addEventListener("pagehide", cleanup, { once: true });
    } catch (error) {
      console.error("Shortcode script failed", error);
    }`;
  return `<!doctype html><html><head><meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: http: data:; media-src https: http:; base-uri 'none'; form-action 'none'">
  <meta name="referrer" content="no-referrer">
  <style>html,body{margin:0}body{overflow-wrap:anywhere}body>div{display:flow-root}${css}</style></head>
  <body><div id="${rootSelector.slice(1)}">${markup}</div><script>${program}</script></body></html>`;
}

export function mountShortcodeScripts(container: HTMLElement) {
  const bank = container.querySelector<HTMLScriptElement>(
    'script[type="application/json"][data-shortcode-scripts]',
  );
  if (!bank?.textContent) return;
  let scripts: Record<string, Script>;
  try {
    scripts = JSON.parse(bank.textContent);
  } catch {
    return;
  }
  const instances = new Map<string, HTMLIFrameElement>();
  const restores: (() => void)[] = [];
  const resize = (event: MessageEvent) => {
    const { type, token, height } = event.data ?? {};
    const frame = instances.get(token);
    if (
      type === "everunfold-shortcode-size" &&
      frame &&
      event.source === frame.contentWindow &&
      Number.isFinite(height)
    )
      frame.style.height = `${Math.max(1, Math.min(5000, height))}px`;
  };
  window.addEventListener("message", resize);
  for (const wrapper of container.querySelectorAll<HTMLElement>(
    "[data-shortcode-instance]",
  )) {
    if (wrapper.closest("[data-content-features]") !== container) continue;
    const instance = wrapper.dataset.shortcodeInstance;
    const script =
      instance && Object.hasOwn(scripts, instance)
        ? scripts[instance]
        : undefined;
    if (
      !script ||
      !wrapper.isConnected ||
      wrapper.querySelector("[data-shortcode-region]")
    )
      continue;
    const ancestor = wrapper.parentElement?.closest<HTMLElement>(
      "[data-shortcode-instance]",
    );
    if (ancestor && ancestor.querySelector("iframe")) continue;
    const token =
      crypto.randomUUID?.() ??
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) =>
        value.toString(16).padStart(2, "0"),
      ).join("");
    const frame = document.createElement("iframe");
    frame.title = script.title;
    frame.sandbox.add("allow-scripts");
    frame.referrerPolicy = "no-referrer";
    frame.style.cssText = `display:block;width:100%;border:0;height:${Math.max(1, Math.ceil(wrapper.getBoundingClientRect().height))}px`;
    frame.srcdoc = scriptDocument(wrapper.innerHTML, script, token);
    const previous = [...wrapper.childNodes];
    wrapper.replaceChildren(frame);
    instances.set(token, frame);
    restores.push(() => {
      frame.remove();
      if (wrapper.isConnected) wrapper.replaceChildren(...previous);
    });
  }
  return () => {
    window.removeEventListener("message", resize);
    for (const restore of restores.reverse()) restore();
  };
}
