type Level = "info" | "warn" | "error";

export function runtimeLog(
  level: Level,
  event: string,
  message: string,
  fields: Record<string, unknown> = {},
) {
  console[level](
    JSON.stringify({
      ...fields,
      time: new Date().toISOString(),
      level: level === "warn" ? "warning" : level,
      component: "nodejs",
      event,
      message,
    }),
  );
}
