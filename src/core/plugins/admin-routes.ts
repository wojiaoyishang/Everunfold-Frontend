const pluginIdPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const entryIdPattern = /^[a-z][a-z0-9-]{0,63}$/;

export function validPluginAdminEntryId(value: string) {
  return entryIdPattern.test(value);
}

export function pluginAdminHref(pluginId: string, pageId: string) {
  return `/admin/plugins/${pluginId}/${pageId}`;
}

export function pluginAdminRoute(pathname: string) {
  const parts = /^\/admin\/plugins\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!parts) return undefined;
  const [, pluginId, pageId] = parts;
  if (!pluginIdPattern.test(pluginId) || !validPluginAdminEntryId(pageId))
    return undefined;
  return { pluginId, pageId };
}
