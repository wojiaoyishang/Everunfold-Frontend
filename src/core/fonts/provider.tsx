"use client";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from "react";
import { builtinFonts } from "./builtins";
import { createFontRegistry, fontStack, inheritedTypography } from "./registry";
import type { FontDefinition, ThemeTypography } from "./types";
import { themeRegistry } from "@/core/extensions/themes";
import { useThemeId } from "@/core/extensions/theme-context";

const Context = createContext(createFontRegistry(builtinFonts, false));
export function RegisteredFontsProvider({
  fonts,
  children,
}: {
  fonts: readonly FontDefinition[];
  children: ReactNode;
}) {
  const registry = useMemo(
    () =>
      createFontRegistry(
        [
          ...builtinFonts,
          ...themeRegistry.all.flatMap((theme) => theme.fonts ?? []),
          ...fonts,
        ],
        false,
      ),
    [fonts],
  );
  return <Context value={registry}>{children}</Context>;
}
export function useRegisteredFonts() {
  return useContext(Context);
}
export function useFont(id: string) {
  const registry = useRegisteredFonts(),
    font = registry.get(id);
  return {
    font,
    available: Boolean(font),
    family: font ? fontStack(font) : "system-ui, sans-serif",
  };
}
export function FontStyles({ ids }: { ids: readonly string[] }) {
  const registry = useRegisteredFonts(),
    css = registry.css(ids);
  return css ? (
    <style
      data-registered-fonts={[...new Set(ids)].join(" ")}
      dangerouslySetInnerHTML={{ __html: css }}
    />
  ) : null;
}
export function useTypographyStyle(typography: ThemeTypography) {
  const registry = useRegisteredFonts();
  const family = (id?: string | null) =>
    id && registry.get(id) ? fontStack(registry.get(id)!) : undefined;
  return {
    ...(family(typography.body) ? { fontFamily: family(typography.body) } : {}),
    ...(family(typography.heading)
      ? { "--theme-heading-font": family(typography.heading) }
      : {}),
    ...(family(typography.code)
      ? { "--code-font-family": family(typography.code) }
      : {}),
  } as CSSProperties;
}
/** Code faces are declared only inside content that actually contains code. */
export function ThemeCodeFont() {
  const typography = inheritedTypography(themeRegistry.chain(useThemeId()));
  return typography.code ? <FontStyles ids={[typography.code]} /> : null;
}
