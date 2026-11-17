import { escapeMarkup } from "@/core/rendering/features/model";

export const footerCredits = [
  {
    label: "Argon 主题制作",
    name: "solstice23",
    href: "https://github.com/solstice23/argon-theme",
  },
  {
    label: "主题重构",
    name: "Everunfold",
    href: "https://github.com/wojiaoyishang/Everunfold-Frontend",
  },
] as const;

export function defaultFooterHtml(translate: (label: string) => string) {
  const credits = footerCredits.map(
    ({ label, name, href }) =>
      `${escapeMarkup(translate(label))} <a href="${href}">${name}</a>`,
  );
  return `<p>\n  ${credits.join(" ·\n  ")}\n</p>`;
}
