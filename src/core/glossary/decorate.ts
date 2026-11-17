import { matchGlossaryText, type GlossaryMatchTerm } from "./match";
import { glossaryTriggerSelector } from "@/core/shortcodes/glossary";

const ignoredSelector = [
  "a",
  "button",
  "code",
  "pre",
  "script",
  "style",
  "svg",
  "math",
  ".katex",
  ".glossary-term",
  glossaryTriggerSelector,
  ".sr-only",
  "[hidden]",
  "[aria-hidden='true']",
  "[data-glossary-ignore]",
].join(",");

function decorateTextNode(
  node: Text,
  terms: readonly GlossaryMatchTerm[],
  limit: number,
  label: (title: string) => string,
  decorated: Set<HTMLElement>,
) {
  if (limit <= 0 || node.parentElement?.closest(ignoredSelector)) return 0;
  const matches = matchGlossaryText(node.data, terms, limit);
  if (!matches.length) return 0;
  const fragment = document.createDocumentFragment();
  let offset = 0;
  for (const match of matches) {
    fragment.append(
      document.createTextNode(node.data.slice(offset, match.start)),
    );
    const shell = document.createElement("span");
    shell.className = "glossary-term";
    shell.dataset.glossaryTerm = match.term.id;
    shell.tabIndex = 0;
    shell.setAttribute("role", "button");
    shell.setAttribute("aria-haspopup", "dialog");
    shell.setAttribute("aria-controls", "glossary-tooltip");
    shell.setAttribute("aria-expanded", "false");
    shell.setAttribute("aria-label", label(match.term.title));
    shell.textContent = match.text;
    fragment.append(shell);
    decorated.add(shell);
    offset = match.end;
  }
  fragment.append(document.createTextNode(node.data.slice(offset)));
  node.replaceWith(fragment);
  return matches.length;
}

/** Follow async markup and innerHTML replacements without rescanning our own writes. */
export function observeGlossaryMarkup(
  root: HTMLElement,
  terms: readonly GlossaryMatchTerm[],
  options: {
    maxMatches: number;
    markupSelector?: string;
    label: (title: string) => string;
  },
) {
  const decorated = new Set<HTMLElement>();
  const observer = new MutationObserver(decorate);
  function decorate() {
    observer.disconnect();
    for (const node of decorated) {
      if (!root.contains(node)) decorated.delete(node);
    }
    let remaining = Math.max(
      0,
      options.maxMatches -
        root.querySelectorAll(".glossary-term[data-glossary-term]").length,
    );
    if (remaining && terms.length) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (
          node.data.trim() &&
          (!options.markupSelector ||
            node.parentElement?.closest(options.markupSelector))
        )
          nodes.push(node);
      }
      for (const node of nodes) {
        remaining -= decorateTextNode(
          node,
          terms,
          remaining,
          options.label,
          decorated,
        );
        if (remaining <= 0) break;
      }
    }
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
  decorate();
  return () => {
    observer.disconnect();
    const parents = new Set<HTMLElement>();
    for (const node of decorated) {
      if (!root.contains(node)) continue;
      if (node.parentElement) parents.add(node.parentElement);
      node.replaceWith(document.createTextNode(node.textContent ?? ""));
    }
    for (const parent of parents) parent.normalize();
    decorated.clear();
  };
}
