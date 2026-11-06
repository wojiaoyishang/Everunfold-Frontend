import definitions from "@/core/contracts/content-types";
import type { ContentTypeDefinition } from "@/core/contracts/content-admin";
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
          `^/admin/content/${type.id}/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/(?:edit|preview|versions|live)$`,
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
      description: "自定义与前端注册页面",
      matchesChild: (path: string) =>
        path === "/admin/pages/new" ||
        /^\/admin\/pages\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}(?:\/(?:preview|live))?$/i.test(
          path,
        ),
      icon: "content",
      menu: { group: "content.types", order: 90 },
    },
  ],
};
