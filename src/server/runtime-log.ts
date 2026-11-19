type Level = "info" | "warn" | "error";

export function runtimeLog(
  level: Level,
  event: string,
  message: string,
  fields: Record<string, unknown> = {},
) {
  const time = new Date().toISOString();
  const severity = level === "warn" ? "warning" : level;
  if (process.env.EVERUNFOLD_LOG_FORMAT === "text") {
    const line = message.replaceAll("\r", "\\r").replaceAll("\n", "\\n");
    const details = Object.keys(fields).length
      ? " " + JSON.stringify(fields)
      : "";
    console[level](`${time} ${severity} [nodejs] ${event}: ${line}${details}`);
    return;
  }
  console[level](
    JSON.stringify({
      ...fields,
      time,
      level: severity,
      component: "nodejs",
      event,
      message,
    }),
  );
}
