import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/core/contracts/collaboration-v1-schema";
import type { ServerFrame } from "@/core/contracts/collaboration";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "collaboration-wire",
);
const frame = ajv.compile<ServerFrame>({
  $ref: "collaboration-wire#/properties/frame",
});
export function readServerFrame(value: string): ServerFrame {
  if (value.length > 6_000_000) throw new Error("同步数据过大");
  const parsed: unknown = JSON.parse(value);
  if (!frame(parsed)) throw new Error("同步数据格式无效");
  return parsed;
}
