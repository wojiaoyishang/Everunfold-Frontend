import type { FrontendConfiguration } from "./schema";

export const browserProtocolHeader = "x-everunfold-browser-protocol";

/** Use the deployment's exact alias only when this page came through it. */
export function browserBackendBaseUrl(
  config: Pick<
    FrontendConfiguration,
    "backendBaseUrl" | "browserLoopbackOrigin"
  >,
  host: string | null,
  protocol: string | null,
): string {
  const local = config.browserLoopbackOrigin;
  return local && local === `${protocol}//${host?.toLowerCase()}`
    ? local
    : config.backendBaseUrl;
}
