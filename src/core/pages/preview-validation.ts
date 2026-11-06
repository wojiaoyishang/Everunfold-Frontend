import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/core/contracts/pages-v1-schema";
import type { PublicManagedPage } from "@/core/contracts/pages";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "page-preview",
);
const validate = ajv.compile<PublicManagedPage>({
  $ref: "page-preview#/properties/public_page",
});
export function checkedPreviewPage(
  value: unknown,
  id: string,
): PublicManagedPage | null {
  return validate(value) && value.id === id ? value : null;
}
