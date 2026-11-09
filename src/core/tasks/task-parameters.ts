import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

export type TaskParameterValues = Record<string, unknown>;
export type TaskParameterSchema = Record<string, unknown>;
export const asRecord = (value: unknown): TaskParameterSchema =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as TaskParameterSchema)
    : {};

/** The server schema is only mapped for presentation; the Worker validates again. */
export function taskParameterFields(schema: TaskParameterSchema) {
  const required = Array.isArray(schema.required) ? schema.required : [];
  return Object.entries(asRecord(schema.properties)).map(([key, value]) => {
    const source = asRecord(value);
    const reference =
      typeof source.$ref === "string" && source.$ref.startsWith("#/")
        ? source.$ref
            .slice(2)
            .split("/")
            .reduce<unknown>(
              (current, part) =>
                asRecord(current)[
                  part.replaceAll("~1", "/").replaceAll("~0", "~")
                ],
              schema,
            )
        : null;
    const definition = reference
      ? { ...asRecord(reference), ...source }
      : source;
    if (reference) delete definition.$ref;
    return {
      key,
      definition,
      required: required.includes(key),
      label: typeof definition.title === "string" ? definition.title : key,
      description:
        typeof definition.description === "string"
          ? definition.description
          : "",
    };
  });
}

export function initialTaskParameters(
  schema: TaskParameterSchema,
  defaults: TaskParameterValues,
): TaskParameterValues {
  return structuredClone({
    ...Object.fromEntries(
      taskParameterFields(schema)
        .filter((field) => Object.hasOwn(field.definition, "default"))
        .map((field) => [field.key, field.definition.default]),
    ),
    ...defaults,
  });
}

function finiteJSON(value: unknown, depth = 0): boolean {
  if (depth > 16) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (Array.isArray(value))
    return value.every((item) => finiteJSON(item, depth + 1));
  return (
    !!value &&
    typeof value === "object" &&
    Object.values(value).every((item) => finiteJSON(item, depth + 1))
  );
}

export function readTaskParameterJSON(
  source: string,
): TaskParameterValues | null {
  try {
    const parsed: unknown = JSON.parse(source);
    return parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      finiteJSON(parsed)
      ? (parsed as TaskParameterValues)
      : null;
  } catch {
    return null;
  }
}

const validators = new WeakMap<TaskParameterSchema, ValidateFunction>();
/** Errors contain schema paths/keywords only; never copy parameter values to diagnostics. */
export function checkTaskParameters(
  schema: TaskParameterSchema,
  value: TaskParameterValues,
): ErrorObject[] {
  if (
    !finiteJSON(value) ||
    new TextEncoder().encode(JSON.stringify(value)).byteLength > 32768
  ) {
    return [
      {
        keyword: "json",
        instancePath: "",
        schemaPath: "",
        params: {},
        message:
          "Parameters must be finite JSON within size and nesting limits",
      },
    ];
  }
  try {
    let validate = validators.get(schema);
    if (!validate) {
      const ajv = new Ajv({ strict: false, allErrors: true });
      addFormats(ajv);
      validate = ajv.compile(schema);
      validators.set(schema, validate);
    }
    return validate(value) ? [] : (validate.errors ?? []);
  } catch {
    // Provider-specific schema features remain subject to authoritative server validation.
    return [];
  }
}
