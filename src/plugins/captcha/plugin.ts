import { definePlugin } from "@everunfold/plugin-sdk";

export default definePlugin({
  id: "core.captcha",
  preview: "asset:assets/preview.webp",
  version: "1.0.0",
  title: "第三方验证码",
  description: "Google reCAPTCHA v2 与 Cloudflare Turnstile 的按需验证组件",
  author: "Everunfold",
  readme:
    "## 功能\n\nGoogle reCAPTCHA v2 与 Cloudflare Turnstile 的按需验证组件。\n\n## 使用\n\n启用后，对应的页面、编辑器工具或组件会出现在相关入口。配置与历史内容在停用时保留。",
  setup({ components }) {
    components.register("core.captcha.google");
    components.register("core.captcha.turnstile");
  },
});
