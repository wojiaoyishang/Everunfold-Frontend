/** Private deployment YAML, shared by every Node entry point. Never send it to clients. */
import { parseDocument, visit } from "yaml";
import { ConfigurationError, configObject } from "./schema";

// tsx loads this module through both ESM (CLI entry points) and CommonJS.
// A module-local WeakMap loses bindings across that boundary. Keep the private
// value on the config itself, under a shared, non-enumerable symbol instead.
const environmentKey = Symbol.for("everunfold.configuration.environment");
type BoundConfiguration = {
  [environmentKey]?: Record<string, string | undefined>;
};
export function configurationEnvironment(
  config: object,
): Record<string, string | undefined> {
  return (config as BoundConfiguration)[environmentKey] ?? process.env;
}
export function bindEnvironment<T extends object>(
  config: T,
  environment: Record<string, string | undefined>,
): T {
  Object.defineProperty(config, environmentKey, {
    value: environment,
    enumerable: false,
    configurable: true,
  });
  return config;
}

export function parseDeployment(source: string) {
  try {
    if (Buffer.byteLength(source) > 1024 * 1024) throw new Error();
    const document = parseDocument(source, {
      uniqueKeys: true,
      prettyErrors: false,
      logLevel: "silent",
    });
    if (document.errors.length || document.warnings.length) throw new Error();
    visit(document, {
      Pair(_, pair) {
        const key = pair.key as { value?: unknown } | null;
        if (typeof key?.value !== "string") throw new Error();
      },
    });
    const value = configObject(document.toJS({ maxAliasCount: 0 }), "配置");
    if (value.version !== 1 || value.component !== "frontend")
      throw new Error();
    configObject(value.application, "application");
    const environment = configObject(value.environment ?? {}, "environment");
    if (
      Object.entries(environment).some(
        ([key, value]) =>
          !/^[A-Z_][A-Z0-9_]*$/.test(key) ||
          typeof value !== "string" ||
          /[\u0000-\u001f\u007f]/.test(value),
      )
    )
      throw new Error();
    return {
      document,
      value,
      environment: environment as Record<string, string>,
    };
  } catch {
    throw new ConfigurationError(
      "部署 YAML 无效；请检查版本、组件、重复键和环境变量格式",
    );
  }
}
