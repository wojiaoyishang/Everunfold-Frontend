import type { CustomPageDefinition } from "@/core/pages/registration";
import { peopleSettings } from "./schema";

export default {
  registration: {
    id: "core.people",
    version: "1.0.0",
    title: "一路有你",
    path: "/links",
    description: "记录同行的人，珍藏沿途的寄语。",
    defaults: Object.fromEntries(
      peopleSettings.fields.map((field) => [field.key, field.default]),
    ),
    settings_schema: JSON.parse(JSON.stringify(peopleSettings)),
  },
  component: "core.people.page",
  settingsModel: peopleSettings,
  localized: true,
} satisfies CustomPageDefinition;
