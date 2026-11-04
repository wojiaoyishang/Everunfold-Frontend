export interface ContentFeatures {
  code: boolean;
  math: boolean;
}
export const featureAssets = {
  code: "/content-features/code-v2.css",
  math: "/content-features/katex-0.19.1/katex.min.css",
  formula: "/content-features/formula-v1.css",
} as const;
export const escapeMarkup = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function formulaHtml(latex: string, display: boolean) {
  const tag = display ? "div" : "span";
  return `<${tag} data-math="${display ? "block" : "inline"}" data-latex="${escapeMarkup(latex)}">${escapeMarkup(latex)}</${tag}>`;
}
export const codeLanguages = [
  ["plaintext", "纯文本"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["xml", "HTML / XML"],
  ["css", "CSS"],
  ["json", "JSON"],
  ["bash", "Shell"],
  ["sql", "SQL"],
  ["cpp", "C / C++"],
  ["csharp", "C#"],
  ["java", "Java"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["php", "PHP"],
  ["yaml", "YAML"],
  ["markdown", "Markdown"],
  ["diff", "Diff"],
] as const;
const aliases: Record<string, string> = {
  text: "plaintext",
  txt: "plaintext",
  js: "javascript",
  ts: "typescript",
  py: "python",
  html: "xml",
  sh: "bash",
  shell: "bash",
  c: "cpp",
  "c++": "cpp",
  cs: "csharp",
  yml: "yaml",
  md: "markdown",
};
export function codeLanguage(name: string) {
  const value = name.toLowerCase();
  return (
    aliases[value] ??
    (codeLanguages.some(([id]) => id === value) ? value : "plaintext")
  );
}
