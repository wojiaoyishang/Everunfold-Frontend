/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./auth-v0.1.schema.json";
import type { AuthContract } from "./auth-contract";
import {
  requestJSON,
  postJSON,
  type RequestOptions,
} from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "auth",
);

const readAuthSessionValidator = ajv.compile<AuthContract["session"]>({
  $ref: "auth#/properties/session",
});
export function readAuthSession(baseUrl: string, options: RequestOptions = {}) {
  return requestJSON(
    baseUrl,
    "/v1/auth/session",
    {},
    readAuthSessionValidator,
    { ...options, credentials: "include" },
  );
}

const loginValidator = ajv.compile<AuthContract["session"]>({
  $ref: "auth#/properties/session",
});
export function login(
  baseUrl: string,
  input: AuthContract["login"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(baseUrl, "/v1/auth/login", input, loginValidator, {
    ...options,
    credentials: "include",
    headers: { ...options.headers, "X-CSRF-Token": csrfToken },
  });
}

const logoutValidator = ajv.compile<AuthContract["session"]>({
  $ref: "auth#/properties/session",
});
export function logout(
  baseUrl: string,
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(baseUrl, "/v1/auth/logout", undefined, logoutValidator, {
    ...options,
    credentials: "include",
    headers: { ...options.headers, "X-CSRF-Token": csrfToken },
  });
}

const readAdminSessionValidator = ajv.compile<AuthContract["session"]>({
  $ref: "auth#/properties/session",
});
export function readAdminSession(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/session",
    {},
    readAdminSessionValidator,
    { ...options, credentials: "include" },
  );
}
