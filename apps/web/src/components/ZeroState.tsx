import type { ReactNode } from "react";

/**
 * A zero state that does work rather than apologising for itself.
 *
 * Left-aligned and full width: a small centred message floating in an empty
 * region is what makes a screen feel abandoned. It always offers the action
 * that resolves it, because an empty screen is an invitation, not a dead end.
 */
export function ZeroState({
  title,
  body,
  action,
  aside,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  aside?: ReactNode;
}): JSX.Element {
  return (
    <div className="zero">
      <div className="zero__title">{title}</div>
      <p className="muted" style={{ fontSize: "var(--text-body-s-size)" }}>
        {body}
      </p>
      {action ? <div className="btn-row">{action}</div> : null}
      {aside}
    </div>
  );
}
