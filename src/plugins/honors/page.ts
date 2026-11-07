import type { CustomPageDefinition } from "@everunfold/plugin-sdk";
import { honorsSettings } from "./schema";

export default {
  registration: {
    id: "core.honors",
    version: "1.0.0",
    title: "我的荣誉",
    path: "/myhonor",
    description: "记录一路走来的努力与收获。",
    defaults: Object.fromEntries(
      honorsSettings.fields.map((field) => [field.key, field.default]),
    ),
    settings_schema: JSON.parse(JSON.stringify(honorsSettings)),
  },
  component: "core.honors.page",
  settingsModel: honorsSettings,
  localized: true,
} satisfies CustomPageDefinition;
