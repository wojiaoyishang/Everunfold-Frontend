import definitions from "@/generated/content-types.json";
import type { ContentTypeDefinition } from "@/generated/content-admin-contract";
import type { AdminModuleRegistration } from "@/core/admin/registry";

/** Build-time backend metadata; editor implementations are trusted frontend registrations. */
export const registeredContentTypes: readonly ContentTypeDefinition[] =
  Object.freeze(definitions.map((definition) => Object.freeze(definition)));
export const contentType = (id: string) =>
  registeredContentTypes.find((item) => item.id === id);
export const contentAdminModule: AdminModuleRegistration = {
  id: "content",
  groups: [{ id: "content.types", label: "内容", order: 15 }],
  pages: [
    ...registeredContentTypes.map((type) => ({
      id: `content.${type.id}`,
      href: `/admin/content/${type.id}`,
      matchesChild: (pathname: string) =>
        pathname === `/admin/content/${type.id}/new` ||
        new RegExp(
          `^/admin/content/${type.id}/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/(?:edit|preview|versions)$`,
          "i",
        ).test(pathname),
      label: type.label,
      description: type.description,
      icon: type.icon === "leaf" ? ("leaf" as const) : ("book" as const),
      menu: { group: "content.types", order: type.order },
    })),
    {
      id: "content.pages",
      href: "/admin/pages",
      label: "页面",
      description: "代码页面目录",
      icon: "content",
      menu: { group: "content.types", order: 90 },
    },
  ],
};
