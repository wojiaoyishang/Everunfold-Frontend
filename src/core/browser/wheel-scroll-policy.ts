import type { WheelScrollPreferences } from "@/core/contracts/settings";

export type WheelScroll = Required<WheelScrollPreferences>;

export const defaultWheelScroll: Readonly<WheelScroll> = {
  enabled: true,
  inertia_ms: 70,
  distance_percent: 100,
  acceleration_percent: 80,
};

export const wheelScrollStep = 5;
export const wheelScrollLimits = {
  inertia_ms: { min: 30, max: 150 },
  distance_percent: { min: 50, max: 200 },
  acceleration_percent: { min: 0, max: 100 },
} as const;

type WheelRange = keyof typeof wheelScrollLimits;

export function parseWheelScrollPreference(
  raw: string,
): WheelScrollPreferences {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const saved = value as Record<string, unknown>;
  const preference: WheelScrollPreferences = {};
  if (typeof saved.enabled === "boolean") preference.enabled = saved.enabled;
  for (const key of Object.keys(wheelScrollLimits) as WheelRange[]) {
    const amount = saved[key];
    const { min, max } = wheelScrollLimits[key];
    if (
      typeof amount === "number" &&
      Number.isInteger(amount) &&
      amount >= min &&
      amount <= max &&
      amount % wheelScrollStep === 0
    ) {
      preference[key] = amount;
    }
  }
  return preference;
}
