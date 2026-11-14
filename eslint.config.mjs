import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettier,
  {
    files: ["src/app/**/*.tsx", "src/themes/**/*.tsx", "src/plugins/**/*.tsx"],
    ignores: ["src/themes/argon/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^(button|input|textarea|select|option|dialog|form|a)$/]",
          message:
            "页面交互控件必须使用共享 ui/ 组件或 AppLink/SearchForm；原生标签只允许在封装层中实现。",
        },
        {
          selector:
            "JSXOpeningElement[name.name='div'] > JSXAttribute[name.name='popover']",
          message: "请使用共享 Popover 组件。",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "_build/**",
    "plugins/**",
    "out/**",
    "coverage/**",
    "var/**",
    "next-env.d.ts",
  ]),
]);
