import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/generated/pages-v1.schema.json";
import type { PublicManagedPage } from "@/generated/pages-contract";
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
