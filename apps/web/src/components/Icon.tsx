/**
 * A deliberately narrow glyph set, drawn on a 20px grid with a 1.6 stroke.
 *
 * An interface where everything carries an icon has no hierarchy left to
 * spend, so these are reserved for the few places a mark reads faster than a
 * word: the step rail, the theme control, and the three outcome states.
 */
export type IconName =
  | "dice"
  | "wave"
  | "scale"
  | "download"
  | "check"
  | "alert"
  | "clock"
  | "sun"
  | "moon"
  | "monitor"
  | "arrow"
  | "undo"
  | "trash";

const PATHS: Record<IconName, JSX.Element> = {
  dice: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="3.5" />
      <circle cx="7.3" cy="7.3" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12.7" cy="12.7" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  wave: <path d="M2 13c2.2 0 2.2-6 4.4-6s2.2 6 4.4 6 2.2-6 4.4-6 2.2 3 2.8 3" />,
  scale: (
    <>
      <path d="M3 13h14" />
      <path d="M6 13V9M10 13V6M14 13v-2" />
    </>
  ),
  download: (
    <>
      <path d="M10 3v9" />
      <path d="M6.2 8.6 10 12.4l3.8-3.8" />
      <path d="M3.5 15.5h13" />
    </>
  ),
  check: <path d="M4 10.6 8 14.6 16 5.8" />,
  alert: (
    <>
      <path d="M10 6.2v4.6" />
      <circle cx="10" cy="13.9" r="0.95" fill="currentColor" stroke="none" />
      <path d="M10 2.6 18.2 16.6H1.8z" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 5.8V10l2.9 1.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="10" cy="10" r="3.6" />
      <path d="M10 1.6v2M10 16.4v2M1.6 10h2M16.4 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M15.9 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4" />
    </>
  ),
  moon: <path d="M16 11.4A6.8 6.8 0 0 1 8.6 4a6.9 6.9 0 1 0 7.4 7.4z" />,
  monitor: (
    <>
      <rect x="2.4" y="3.6" width="15.2" height="10" rx="2" />
      <path d="M7 16.8h6" />
    </>
  ),
  arrow: <path d="M4 10h11m-4.2-4.2L15 10l-4.2 4.2" />,
  undo: (
    <>
      <path d="M4 7.5h7.5a4 4 0 0 1 0 8H7" />
      <path d="M6.8 4.3 3.6 7.5l3.2 3.2" />
    </>
  ),
  trash: (
    <>
      <path d="M3.6 5.6h12.8" />
      <path d="M5.4 5.6 6.1 16a1.2 1.2 0 0 0 1.2 1.1h5.4a1.2 1.2 0 0 0 1.2-1.1l.7-10.4" />
      <path d="M7.8 5.6V4.1a1 1 0 0 1 1-1h2.4a1 1 0 0 1 1 1v1.5" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
