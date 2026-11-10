const eventName = "everunfold:session-changed";
const channelName = "everunfold-auth-session-v1";
const normalized = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

/** Announce only an invalidation hint; identity and CSRF values never leave memory. */
export function announceSessionChange(
  baseUrl: string,
  signedOut = false,
  source?: string,
) {
  if (typeof window === "undefined") return;
  const target = normalized(baseUrl);
  const message = {
    type: signedOut ? "signed-out" : "changed",
    target,
    ...(source ? { source } : {}),
  };
  window.dispatchEvent(new CustomEvent(eventName, { detail: message }));
  try {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Focus/visibility checks still refresh sessions when a browser blocks channels.
  }
}

export function watchSessionChange(
  baseUrl: string,
  refresh: (signedOut: boolean) => void,
  source?: string,
) {
  if (typeof window === "undefined") return () => {};
  const target = normalized(baseUrl);
  const receive = (data: unknown) => {
    if (
      data &&
      typeof data === "object" &&
      "type" in data &&
      (data.type === "changed" || data.type === "signed-out") &&
      "target" in data &&
      data.target === target &&
      !(source && "source" in data && data.source === source)
    )
      refresh(data.type === "signed-out");
  };
  const local = (event: Event) => {
    if (event instanceof CustomEvent) receive(event.detail);
  };
  window.addEventListener(eventName, local);
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(channelName);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      receive(event.data);
    };
  } catch {
    // Channels are optional; the same-page event remains available.
  }
  return () => {
    window.removeEventListener(eventName, local);
    channel?.close();
  };
}
