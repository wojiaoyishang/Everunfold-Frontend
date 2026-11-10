import type { CSSProperties } from "react";

const paths = {
  sliders: "M4 6h5m4 0h7M4 18h9m4 0h3M9 3v6h4V3H9Zm4 12v6h4v-6h-4",
  puzzle:
    "M4 4h5a3 3 0 1 1 6 0h5v5a3 3 0 1 0 0 6v5h-5a3 3 0 1 0-6 0H4v-5a3 3 0 1 1 0-6V4Z",
  shapes:
    "M7 3 2 11h10L7 3ZM14 14h7v7h-7v-7ZM21 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM10 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  plug: "M8 3v5M16 3v5M5 8h14M7 8v5a5 5 0 0 0 10 0V8M12 18v4",
  mail: "M3 5h18v14H3V5Zm0 0 9 8 9-8",

  server:
    "M3 3h18v7H3V3ZM3 14h18v7H3v-7ZM6 6.5h.01M6 17.5h.01M10 6.5h8M10 17.5h8",
  activity: "M2 12h4l3-8 6 16 3-8h4",
  languages:
    "M4 5h10M9 3v2M6 5c0 5 4 8 8 10M12 5c0 5-4 8-9 10M14 21l4-10 4 10M15.5 17h5",
  video: "M3 5h13v14H3V5Zm13 5 5-3v10l-5-3M7 9l5 3-5 3V9Z",
  formula: "M18 4H7l7 8-7 8h11M7 4H5M7 20H5",
  type: "M4 4h16M12 4v16M8 20h8M4 4v3M20 4v3",
  save: "M4 3h13l4 4v14H3V3h1ZM7 3v6h10V3M7 21v-8h10v8",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  underline: "M6 3v7a6 6 0 0 0 12 0V3M4 21h16",
  "align-left": "M3 5h18M3 10h12M3 15h18M3 20h12",
  "align-center": "M3 5h18M6 10h12M3 15h18M6 20h12",
  "align-right": "M3 5h18M9 10h12M3 15h18M9 20h12",
  grip: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  bold: "M6 4h7a4 4 0 0 1 0 8H6V4ZM6 12h8a4 4 0 0 1 0 8H6v-8Z",
  italic: "M10 4h10M4 20h10M15 4 9 20",
  strike:
    "M17 5c-1-1-3-2-5-2-3 0-5 2-5 4 0 2 2 3 5 4M4 12h16M8 17c1 2 3 3 5 3 3 0 5-2 5-4",
  code: "m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  shortcode:
    "M9 4H7a2 2 0 0 0-2 2v3a3 3 0 0 1-2 3 3 3 0 0 1 2 3v3a2 2 0 0 0 2 2h2M15 4h2a2 2 0 0 1 2 2v3a3 3 0 0 0 2 3 3 3 0 0 0-2 3v3a2 2 0 0 1-2 2h-2m-4-11 3 3-3 3",
  quote: "M4 6h6v6H5v5h4v2H3V9l1-3ZM15 6h6v6h-5v5h4v2h-6V9l1-3Z",
  table: "M3 4h18v16H3V4ZM3 9h18M3 14h18M9 4v16M15 4v16",
  "ordered-list":
    "M9 6h12M9 12h12M9 18h12M3 4h1v4M3 12c0-2 3-2 3 0l-3 3h3M3 18h3l-2 2h2",
  checklist:
    "m3 5 1 1 2-2M10 5h11M3 11h3v3H3v-3ZM10 12h11M3 18h3v3H3v-3ZM10 19h11",
  "code-block": "M3 4h18v16H3V4Zm5 5-3 3 3 3m8-6 3 3-3 3M13 8l-2 8",
  wrap: "M3 6h18M3 11h14a4 4 0 0 1 0 8h-5m3-3-3 3 3 3M3 16h4",
  "chevron-up": "m6 15 6-6 6 6",
  "chevron-down": "m6 9 6 6 6-6",
  "indent-more": "M10 5h11M10 12h11M10 19h11M3 8l4 4-4 4",
  "indent-less": "M10 5h11M10 12h11M10 19h11M7 8l-4 4 4 4",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  crop: "M6 3v15h15M3 6h15v15M18 6l3-3",
  rotate: "M3 10a9 9 0 1 1 3 9M3 4v6h6",
  "flip-horizontal": "M12 3v18M3 6l6 6-6 6V6ZM21 6l-6 6 6 6V6Z",
  "flip-vertical": "M3 12h18M6 3l6 6 6-6H6ZM6 21l6-6 6 6H6Z",
  undo: "M3 10h11a6 6 0 0 1 0 12M8 5l-5 5 5 5",
  redo: "M21 10H10a6 6 0 0 0 0 12M16 5l5 5-5 5",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  grid: "M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z",
  image: "M4 4h16v16H4V4ZM4 16l5-5 5 5 3-3 3 3M15 8h.01",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
  desktop: "M3 4h18v13H3V4ZM12 17v4M8 21h8",
  tablet:
    "M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM11 19h2",
  phone:
    "M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM11 19h2",
  sidebar: "M3 4h18v16H3V4ZM9 4v16",

  lock: "M6 10h12v11H6V10ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
  logout: "M9 3H4v18h5M10 12h11m-4-4 4 4-4 4",
  "eye-off":
    "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a21 21 0 0 1-3.2 3.9M6 6C3.5 8 2 12 2 12s4 7 10 7c1.6 0 3-.5 4.3-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2",
  cloud: "M6 18a4 4 0 0 1-1-7.9 7 7 0 0 1 13.5-1.8A5 5 0 0 1 18 18H6Z",
  "cloud-check":
    "M7 18H6a4 4 0 0 1-1-7.9 7 7 0 0 1 13.5-1.8A5 5 0 0 1 20 17M10 17l3 3 7-7",
  "cloud-off":
    "M3 3l18 18M7 18H6a4 4 0 0 1-1-7.9M9 5a7 7 0 0 1 9.5 3.3A5 5 0 0 1 21 16M11 18h4",
  refresh:
    "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1",
  external:
    "M14 3h7v7M21 3l-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
  copy: "M8 8h13v13H8V8ZM16 8V3H3v13h5",
  check: "m5 12 4 4L19 6",
  warning: "m12 3 10 18H2L12 3ZM12 9v5M12 17h.01",
  plus: "M12 4v16M4 12h16",
  minus: "M4 12h16",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  reply: "M9 4 3 10l6 6M3 10h10a8 8 0 0 1 8 8v2",
  smile:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 9h.01M16 9h.01M8 14s1 3 4 3 4-3 4-3",
  send: "m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  edit: "m15 4 5 5M4 16 16 4a3.5 3.5 0 0 1 5 5L9 21H4v-5Z",
  play: "m8 4 12 8-12 8V4Z",
  pause: "M8 5v14M16 5v14",
  settings:
    "M9 3h6l.7 3 2.6-1.2 3 5.2-2.3 2 2.3 2-3 5.2-2.6-1.2-.7 3H9l-.7-3-2.6 1.2-3-5.2 2.3-2-2.3-2 3-5.2L8.3 6 9 3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  flask: "M9 3h6M10 3v6l-6 10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L14 9V3M8 14h8",
  leaf: "M20 3c-10-1-16 3-16 9a7 7 0 0 0 7 7c6 0 9-7 9-16ZM3 21l12-12",
  chevron: "m9 5 7 7-7 7",
  "chevron-left": "m15 5-7 7 7 7",
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
  "arrow-left": "M20 12H4m6-6-6 6 6 6",
  up: "M12 20V4m-6 6 6-6 6 6",
  down: "M12 4v16m-6-6 6 6 6-6",
  pin: "m9 3 6 0-1 6 4 4H6l4-4-1-6ZM12 13v8",
  archive: "M3 3h18v5H3V3ZM5 8v13h14V8M10 12h4",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  book: "M4 3h7l1 2 1-2h7v16h-7l-1 2-1-2H4V3ZM12 5v16",
  glossary: "M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3V3Zm3 14h11M9 7h6M9 11h4",
  link: "m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
  campfire:
    "M12 2c2 5-2 6-2 9 0 2 2 3 3 1 1-1 0-3 1-5 5 5 6 8 3 11-3 3-8 3-11 0C2 13 7 8 12 2ZM5 22l14-3M5 19l14 3",
} as const;

export type IconName = keyof typeof paths;
export const builtinIconNames = Object.freeze(Object.keys(paths) as IconName[]);
export const isBuiltinIcon = (name: string): name is IconName =>
  Object.hasOwn(paths, name);

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
