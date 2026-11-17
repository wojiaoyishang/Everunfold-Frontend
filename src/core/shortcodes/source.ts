import type { PublicShortcode } from "@/core/contracts/settings";

/** Serialize one invocation using the definition's parameter order and JSON string quoting. */
export function shortcodeCall(
  definition: Pick<PublicShortcode, "name" | "kind" | "parameters">,
  values: Readonly<Record<string, string>> = {},
  body = "",
) {
  const attributes = definition.parameters
    .map(
      (parameter) =>
        ` ${parameter.name}=${JSON.stringify(values[parameter.name] ?? parameter.default ?? "")}`,
    )
    .join("");
  const head = `{{< ${definition.name}${attributes} >}}`;
  return definition.kind === "container"
    ? `${head}\n${body}\n{{< /${definition.name} >}}`
    : head;
}
