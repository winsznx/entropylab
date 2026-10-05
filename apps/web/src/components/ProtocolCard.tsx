import type { Protocol } from "../protocol.js";

/**
 * The collection protocol, stated where the operator will be standing.
 *
 * Shown before capture rather than linked from it. Someone about to roll two
 * hundred and fifty-six times needs the invalid-roll rule in front of them,
 * not in a document they will read afterwards.
 */
export function ProtocolCard({
  protocol,
  compact = false,
}: {
  protocol: Protocol;
  compact?: boolean;
}): JSX.Element {
  return (
    <div className="protocol">
      {protocol.perSession !== null && protocol.sessions !== null ? (
        <div className="protocol__target">
          <span className="protocol__target-figure">
            {protocol.sessions} &times; {protocol.perSession}
          </span>
          <span className="protocol__target-label">
            sessions of valid observations, {protocol.sessions * protocol.perSession} in total
          </span>
        </div>
      ) : null}

      <p className="protocol__rationale">{protocol.rationale}</p>

      <dl className="protocol__rules">
        <dt>Hold constant</dt>
        <dd>
          {protocol.constants.join(", ")}. Only the session boundary changes. Calibration is only
          meaningful if the procedure you describe is the one you keep using.
        </dd>

        <dt>Invalid outcomes</dt>
        <dd>{protocol.invalidRule}</dd>

        {compact ? null : (
          <>
            <dt>Recording</dt>
            <dd>
              <ul className="protocol__list">
                {protocol.recording.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
