"use client";

/**
 * A small, consistent icon set drawn inline — no icon font, no extra request,
 * and they inherit colour from the card they sit in.
 */

const PATHS = {
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  pin: "M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z M12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  users:
    "M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20 M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M22 20v-1.5a4 4 0 0 0-3-3.87 M16 3.6a4 4 0 0 1 0 6.8",
  clip: "M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 1 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.9-7.8",
  video: "M22 8.5v7l-5-3.5 5-3.5Z M3 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
  chevron: "m9 6 6 6-6 6",
  calendar: "M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M21 21l-4.2-4.2",
  plus: "M12 5v14M5 12h14",
  refresh: "M20 11a8 8 0 0 0-14-4.5L4 9 M4 5v4h4 M4 13a8 8 0 0 0 14 4.5L20 15 M20 19v-4h-4",
  trash: "M4 7h16 M10 11v6M14 11v6 M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12 M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2",
  close: "M6 6l12 12M18 6 6 18",
  link: "M10 13a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6 M14 11a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7L12.5 18",
  check: "m5 12.5 4.5 4.5L19 7",
  alert: "M12 8v5M12 17h.01 M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  download: "M12 3v12M7.5 11l4.5 4.5 4.5-4.5 M4 20h16",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1A1.6 1.6 0 0 0 10 3.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.4a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1.2Z",
  inbox: "M4 13h4l1.5 3h5L16 13h4 M5 5h14l1.8 7.4a2 2 0 0 1 .2.9V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.7c0-.3 0-.6.2-.9L5 5Z",
  mail: "M3 7l8.2 5.5a1.5 1.5 0 0 0 1.6 0L21 7 M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  pencil: "M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z M14 6l4 4",
  repeat: "M17 2.5 20.5 6 17 9.5 M3 12V9a3 3 0 0 1 3-3h14 M7 21.5 3.5 18 7 14.5 M21 12v3a3 3 0 0 1-3 3H4",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4",
  file: "M14 3v5h5 M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z",
  eye: "M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z",
  phone:
    "M21 16.9v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.6A2 2 0 0 1 3.3 2H6a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.1 9.8a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8 M13.7 21a2 2 0 0 1-3.4 0",
  image: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M9 10a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 9 10 M21 15.5 16 11l-9 8.5",
  shuffle: "M17 3.5 20.5 7 17 10.5 M3 7h3.5l3 4.5 M3 17h3.5L14 6h6.5 M17 13.5 20.5 17 17 20.5 M14 17h6.5",
  crop: "M6.5 2v13.5a2 2 0 0 0 2 2H22 M2 6.5h13.5a2 2 0 0 1 2 2V22",
  lock: "M7 10V7a5 5 0 0 1 10 0v3 M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
  code: "m8 6-6 6 6 6 M16 6l6 6-6 6",
  hash: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18",
  qr: "M4 4h6v6H4V4Z M14 4h6v6h-6V4Z M4 14h6v6H4v-6Z M14 14h2v2h-2v-2Z M18 14h2v2h-2v-2Z M14 18h2v2h-2v-2Z M18 18h2v2h-2v-2Z",
  scale: "M12 3v18 M3 7h18 M6 7l-3 6h6l-3-6Z M18 7l-3 6h6l-3-6Z",
  bank: "M3 10h18 M5 10v8M9 10v8M15 10v8M19 10v8 M2 21h20 M12 3 2 9h20L12 3Z",
};

export default function Icon({ name, size = 16, className = "", strokeWidth = 1.7 }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d.split(" M").map((segment, i) => (
        <path key={i} d={i === 0 ? segment : `M${segment}`} />
      ))}
    </svg>
  );
}
