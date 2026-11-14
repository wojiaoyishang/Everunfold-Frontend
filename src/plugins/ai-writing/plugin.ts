import { definePlugin } from "@everunfold/plugin-sdk";
import { writingScenes } from "./fields";

export default definePlugin({
  id: "core.ai-writing",
  version: "1.0.0",
  title: "AI 写作助手",
  description: "为摘要、搜索与分享文案提供生成建议。",
  surface: "admin",
  setup({ components, formFields }) {
    components.register("core.ai-writing.settings");
    components.register("core.ai-writing.generate");
    for (const { scene, fields } of writingScenes) {
      for (const field of Object.keys(fields)) {
        formFields.register({
          id: `${scene}.${field}`,
          scene,
          field,
          stage: "render",
          priority: 100,
          component: "core.ai-writing.generate",
        });
      }
    }
  },
});
