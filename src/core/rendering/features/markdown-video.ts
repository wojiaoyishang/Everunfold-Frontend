import type MarkdownIt from "markdown-it";

/** An image-shaped video call, parsed before images so escaped/code examples stay literal. */
export function markdownVideo(md: InstanceType<typeof MarkdownIt>) {
  md.inline.ruler.before("image", "video", (state, silent) => {
    const start = state.pos;
    if (!state.src.startsWith("![", start)) return false;
    const label = md.helpers.parseLinkLabel(state, start + 1, false);
    if (label < 0 || state.src[label + 1] !== "(") return false;
    let at = label + 2;
    while (/\s/.test(state.src[at] ?? "")) at++;
    const target = md.helpers.parseLinkDestination(state.src, at, state.posMax);
    if (!target.ok) return false;
    const url = md.normalizeLink(target.str);
    if (!md.validateLink(url)) return false;
    at = target.pos;
    const gap = at;
    while (/\s/.test(state.src[at] ?? "")) at++;
    let title = "";
    if (at > gap) {
      const parsed = md.helpers.parseLinkTitle(state.src, at, state.posMax);
      if (parsed.ok) {
        title = parsed.str;
        at = parsed.pos;
        while (/\s/.test(state.src[at] ?? "")) at++;
      }
    }
    if (!state.src.startsWith("){type=video}", at)) return false;
    if (!silent) {
      const token = state.push("video", "video", 0);
      token.attrs = [
        ["src", url],
        ["controls", ""],
        ["preload", "none"],
      ];
      const caption = md.utils.unescapeAll(state.src.slice(start + 2, label));
      if (title || caption) token.attrSet("title", title || caption);
    }
    state.pos = at + "){type=video}".length;
    return true;
  });
  md.renderer.rules.video = (tokens, index, _options, _env, renderer) =>
    `<video${renderer.renderAttrs(tokens[index])}></video>`;
}
