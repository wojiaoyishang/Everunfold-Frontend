import { definePlugin } from "@everunfold/plugin-sdk";

export default definePlugin({
  id: "core.captcha",
  version: "1.0.0",
  title: "第三方验证码",
  description: "Google reCAPTCHA v2 与 Cloudflare Turnstile 的按需验证组件",
  setup({ components }) {
    components.register("core.captcha.google");
    components.register("core.captcha.turnstile");
  },
});
