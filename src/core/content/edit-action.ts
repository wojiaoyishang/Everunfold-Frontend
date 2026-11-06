import { readContentActions } from "@/core/contracts/content-admin";
import type { ContentEditAction } from "@/core/contracts/content-admin";
import { RequestError, type RequestOptions } from "@/core/http/request";
import { contentType } from "@/core/content-management/registry";

/** Authentication and content permission are both checked by FastAPI, never the demo visitor. */
export async function readEditAction(
  baseUrl: string,
  id: string,
  options: RequestOptions = {},
) {
  try {
    return (await readContentActions(baseUrl, { id }, options)).data.edit;
  } catch (error) {
    if (
      error instanceof RequestError &&
      [401, 403, 404].includes(error.status ?? 0)
    )
      return null;
    throw error;
  }
}

export function contentEditHref(
  id: string,
  action: ContentEditAction | null | undefined,
) {
  if (!action || action.id !== id || !contentType(action.type_id)) return null;
  return `/admin/content/${action.type_id}/${action.id}/edit`;
}
