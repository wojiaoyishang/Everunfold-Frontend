import type { CSSProperties } from "react";

const paths = {
  play: "m8 4 12 8-12 8V4Z",
  pause: "M8 5v14M16 5v14",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  flask: "M9 3h6M10 3v6l-6 10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L14 9V3M8 14h8",
  leaf: "M20 3c-10-1-16 3-16 9a7 7 0 0 0 7 7c6 0 9-7 9-16ZM3 21l12-12",
  chevron: "m9 5 7 7-7 7",
  expand: "M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6",
  home: "M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9",
  search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  sun: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20.5 13.5A9 9 0 0 1 10.5 3a9 9 0 1 0 10 10.5Z",
  calendar:
    "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4M17 3v4M3 11h18",
  folder: "M3 7V5h6l2 2h10v13H3V7Z",
  tag: "m3 12 9 9 9-9V3h-9l-9 9ZM16 7h.01",
  comment:
    "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z",
  clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  user: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  up: "M12 20V4m-6 6 6-6 6 6",
  pin: "m9 3 6 0-1 6 4 4H6l4-4-1-6ZM12 13v8",
  archive: "M3 3h18v5H3V3ZM5 8v13h14V8M10 12h4",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  book: "M4 3h7l1 2 1-2h7v16h-7l-1 2-1-2H4V3ZM12 5v16",
  link: "m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
  campfire:
    "M12 2c2 5-2 6-2 9 0 2 2 3 3 1 1-1 0-3 1-5 5 5 6 8 3 11-3 3-8 3-11 0C2 13 7 8 12 2ZM5 22l14-3M5 19l14 3",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "",
  style,
}: {
  name: IconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={`icon ${className}`}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
