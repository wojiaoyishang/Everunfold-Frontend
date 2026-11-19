type Level = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown> & { symbol?: string };

export function runtimeLog(
  level: Level,
  event: string,
  message: string,
  fields: LogFields = {},
) {
  const time = new Date().toISOString();
  const severity = level === "warn" ? "warning" : level;
  const { symbol, ...other } = fields;
  const context = {
    ...other,
    pid: process.pid,
    ...(typeof symbol === "string" &&
    /^[\p{L}\p{N}][\p{L}\p{N}_.:-]{0,63}$/u.test(symbol)
      ? { symbol }
      : {}),
  };
  if (process.env.EVERUNFOLD_LOG_FORMAT === "text") {
    const line = message.replaceAll("\r", "\\r").replaceAll("\n", "\\n");
    const details = " " + JSON.stringify(context);
    console[level](`${time} ${severity} [nodejs] ${event}: ${line}${details}`);
    return;
  }
  console[level](
    JSON.stringify({
      ...context,
      time,
      level: severity,
      component: "nodejs",
      event,
      message,
    }),
  );
}

function atLevel(level: Level) {
  return (event: string, message: string, fields?: LogFields) =>
    runtimeLog(level, event, message, fields);
}

export const runtimeLogger = {
  debug: atLevel("debug"),
  info: atLevel("info"),
  warn: atLevel("warn"),
  error: atLevel("error"),
};
