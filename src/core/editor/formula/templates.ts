export const formulaGroups = [
  ["common", "常用"],
  ["structures", "结构"],
  ["calculus", "微积分"],
  ["greek", "希腊字母"],
  ["relations", "关系与集合"],
  ["matrices", "矩阵与对齐"],
] as const;
export interface FormulaTemplate {
  name: string;
  group: (typeof formulaGroups)[number][0];
  latex: string;
  preview?: string;
}
/** Trusted templates only. #0 wraps the selection; #? creates a navigable slot. */
export const formulaTemplates: readonly FormulaTemplate[] = [
  { name: "分式", group: "common", latex: String.raw`\frac{#0}{#?}` },
  { name: "上标", group: "common", latex: String.raw`{#0}^{#?}` },
  { name: "下标", group: "common", latex: String.raw`{#0}_{#?}` },
  { name: "平方根", group: "common", latex: String.raw`\sqrt{#0}` },
  { name: "求和", group: "common", latex: String.raw`\sum_{#?}^{#?}{#0}` },
  {
    name: "定积分",
    group: "common",
    latex: String.raw`\int_{#?}^{#?}{#0}\,\mathrm{d}x`,
  },
  { name: "圆括号", group: "common", latex: String.raw`\left(#0\right)` },
  { name: "无穷", group: "common", latex: String.raw`\infty` },
  { name: "正负", group: "common", latex: String.raw`\pm` },
  { name: "希腊字母 π", group: "common", latex: String.raw`\pi` },
  { name: "多次根", group: "structures", latex: String.raw`\sqrt[#?]{#0}` },
  { name: "上下标", group: "structures", latex: String.raw`{#0}_{#?}^{#?}` },
  { name: "方括号", group: "structures", latex: String.raw`\left[#0\right]` },
  { name: "大括号", group: "structures", latex: String.raw`\left\{#0\right\}` },
  { name: "绝对值", group: "structures", latex: String.raw`\left|#0\right|` },
  { name: "向量", group: "structures", latex: String.raw`\vec{#0}` },
  { name: "上划线", group: "structures", latex: String.raw`\overline{#0}` },
  {
    name: "文本",
    group: "structures",
    latex: String.raw`\text{#0}`,
    preview: String.raw`\text{abc}`,
  },
  { name: "极限", group: "calculus", latex: String.raw`\lim_{x\to #?}{#0}` },
  { name: "积分", group: "calculus", latex: String.raw`\int{#0}\,\mathrm{d}x` },
  { name: "二重积分", group: "calculus", latex: String.raw`\iint_{#?}{#0}` },
  {
    name: "偏导数",
    group: "calculus",
    latex: String.raw`\frac{\partial{#0}}{\partial x}`,
  },
  {
    name: "导数",
    group: "calculus",
    latex: String.raw`\frac{\mathrm{d}{#0}}{\mathrm{d}x}`,
  },
  { name: "连乘", group: "calculus", latex: String.raw`\prod_{#?}^{#?}{#0}` },
  ...[
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "theta",
    "lambda",
    "mu",
    "pi",
    "rho",
    "sigma",
    "phi",
    "omega",
    "Delta",
    "Sigma",
    "Omega",
  ].map((name) => ({ name, group: "greek" as const, latex: "\\" + name })),
  ...[
    "leq",
    "geq",
    "neq",
    "approx",
    "equiv",
    "in",
    "notin",
    "subseteq",
    "cup",
    "cap",
    "emptyset",
    "forall",
    "exists",
    "rightarrow",
    "Rightarrow",
    "Leftrightarrow",
  ].map((name) => ({ name, group: "relations" as const, latex: "\\" + name })),
  {
    name: "圆括号矩阵",
    group: "matrices",
    latex: String.raw`\begin{pmatrix}#0&#?\\#?&#?\end{pmatrix}`,
  },
  {
    name: "方括号矩阵",
    group: "matrices",
    latex: String.raw`\begin{bmatrix}#0&#?\\#?&#?\end{bmatrix}`,
  },
  {
    name: "行列式",
    group: "matrices",
    latex: String.raw`\begin{vmatrix}#0&#?\\#?&#?\end{vmatrix}`,
  },
  {
    name: "分段函数",
    group: "matrices",
    latex: String.raw`\begin{cases}#0&#?\\#?&#?\end{cases}`,
  },
  {
    name: "多行对齐",
    group: "matrices",
    latex: String.raw`\begin{aligned}#0&=#?\\#?&=#?\end{aligned}`,
  },
];
export const templatePreview = (latex: string) =>
  latex.replace(/#(?:0|\?)/g, String.raw`\square`);
export function templateSource(latex: string, selected = "") {
  const marker = latex.includes("#0") ? "#0" : "#?";
  const index = latex.indexOf(marker);
  const plain = (value: string) => value.replace(/#(?:0|\?)/g, "");
  return index < 0
    ? { before: latex + " ", after: "" }
    : {
        before: plain(latex.slice(0, index)),
        after: plain(latex.slice(index + 2)),
        selected,
      };
}
