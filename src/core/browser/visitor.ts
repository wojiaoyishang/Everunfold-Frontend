const visitors = new Map<string, string>();
const uuid4 =
  /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

/** Anonymous reaction preference only. No account identity; isolate different backends. */
export function visitorId(baseUrl: string) {
  const key = `everunfold.comment-visitor.v1:${new URL(baseUrl).href}`;
  const existing = visitors.get(key);
  if (existing) return existing;
  let value: string | null = null;
  try {
    value = localStorage.getItem(key);
  } catch {
    /* Memory-only if browser storage is unavailable. */
  }
  if (!value || !uuid4.test(value)) {
    value = crypto.randomUUID();
    try {
      localStorage.setItem(key, value);
    } catch {
      /* A real ACK still works without persistence. */
    }
  }
  visitors.set(key, value);
  return value;
}
