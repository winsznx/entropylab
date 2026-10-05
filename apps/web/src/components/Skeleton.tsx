/**
 * Placeholder matching the geometry of what replaces it.
 *
 * Call sites pass the real dimensions of the content, so nothing shifts when
 * the result lands. A generic grey block that is the wrong size is worse than
 * no placeholder, because the jump tells the reader the page lied.
 */
export function Skeleton({
  w = "100%",
  h = 16,
  r,
}: {
  w?: string | number;
  h?: string | number;
  r?: number;
}): JSX.Element {
  return (
    <span
      className="sk"
      aria-hidden="true"
      style={{ width: w, height: h, borderRadius: r ?? undefined }}
    />
  );
}
