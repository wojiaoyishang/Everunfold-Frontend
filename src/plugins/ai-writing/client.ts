import type {
  Availability,
  Configuration,
  Generation,
  GenerationRequest,
  SaveConfiguration,
  TestRequest,
} from "./contract";

const prefix = "/v1/plugins/core.ai-writing";

export interface AdminRequest {
  baseUrl: string;
  csrfToken: string;
}

export class WritingRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code?: number,
  ) {
    super("AI writing request failed");
  }
}

async function request<T>(
  { baseUrl, csrfToken }: AdminRequest,
  path: string,
  method: "GET" | "PUT" | "POST",
  signal: AbortSignal,
  input?: object,
): Promise<T> {
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}${prefix}${path}`,
    {
      method,
      credentials: "include",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      headers: {
        Accept: "application/json",
        ...(method === "GET"
          ? {}
          : { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }),
      },
      body: input === undefined ? undefined : JSON.stringify(input),
    },
  );
  const result: { success?: boolean; code?: number; data?: T } | null =
    await response.json().catch(() => null);
  if (!response.ok)
    throw new WritingRequestError(response.status, result?.code);
  if (
    result?.success !== true ||
    !result.data ||
    result.code !== response.status
  )
    throw new WritingRequestError(502);
  return result.data;
}

export const readConfiguration = (admin: AdminRequest, signal: AbortSignal) =>
  request<Configuration>(admin, "/configuration", "GET", signal);

export const saveConfiguration = (
  admin: AdminRequest,
  value: SaveConfiguration,
  signal: AbortSignal,
) => request<Configuration>(admin, "/configuration", "PUT", signal, value);

export const readAvailability = (admin: AdminRequest, signal: AbortSignal) =>
  request<Availability>(admin, "/availability", "GET", signal);

export const startGeneration = (
  admin: AdminRequest,
  input: GenerationRequest,
  signal: AbortSignal,
) => request<Generation>(admin, "/generations", "POST", signal, input);

export const startTest = (
  admin: AdminRequest,
  input: TestRequest,
  signal: AbortSignal,
) => request<Generation>(admin, "/test", "POST", signal, input);

export const readGeneration = (
  admin: AdminRequest,
  id: string,
  signal: AbortSignal,
) =>
  request<Generation>(
    admin,
    `/generations/${encodeURIComponent(id)}`,
    "GET",
    signal,
  );
