declare module "next/dist/compiled/react-refresh/runtime" {
  export function injectIntoGlobalHook(global: typeof globalThis): void;
  export function register(type: unknown, id: string): void;
  export function createSignatureFunctionForTransform(): unknown;
  export function performReactRefresh(): unknown;
}
