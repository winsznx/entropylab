import { adequacyOf, LAG_MINIMUM, MARKOV_MINIMUM, type Protocol } from "../protocol.js";

const LEVEL_LABEL = {
  none: "No evidence yet",
  "frequency-only": "Frequency only",
  partial: "Partial evidence",
  complete: "All methods will run",
} as const;

/**
 * Where this session stands against the protocol, and what the count supports.
 *
 * The two are deliberately separate. Analysis will run on almost any number
 * of observations; that is not the same as the evidence being enough to
 * decide on, and a capture screen that shows only a count invites the reader
 * to conflate them. The thresholds drawn on the track are the estimator
 * applicability gates, not a new judgement about sample size.
 */
export function SessionProgress({
  count,
  protocol,
  sessionIndex,
}: {
  count: number;
  protocol: Protocol;
  sessionIndex: number;
}): JSX.Element {
  const target = protocol.perSession;
  const adequacy = adequacyOf(count);
  const axisMax = Math.max(target ?? LAG_MINIMUM, count, LAG_MINIMUM);
  const position = (value: number): string => `${Math.min(100, (value / axisMax) * 100)}%`;

  return (
    <div className="progress">
      <div className="progress__head">
        <div>
          <span className="progress__count">
            <span className="progress__value">{count}</span>
            {target !== null ? <span className="progress__of"> / {target}</span> : null}
          </span>
          <div className="field__hint">valid observations recorded</div>
        </div>
        {protocol.sessions !== null ? (
          <span className="progress__session">
            Session {sessionIndex} of {protocol.sessions}
          </span>
        ) : null}
      </div>

      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target ?? axisMax}
        aria-valuenow={count}
        aria-label="Observations recorded in this session"
      >
        <div
          className="progress__fill"
          style={{ width: `${Math.min(100, (count / axisMax) * 100)}%` }}
        />
        <div className="progress__mark" style={{ left: position(MARKOV_MINIMUM) }} />
        <div className="progress__mark" style={{ left: position(LAG_MINIMUM) }} />
      </div>

      <div className="progress__legend">
        <span>{MARKOV_MINIMUM} Markov runs</span>
        <span>{LAG_MINIMUM} lag predictor runs</span>
        {target !== null && target !== LAG_MINIMUM ? <span>{target} session target</span> : null}
      </div>

      <div className={`adequacy adequacy--${adequacy.level}`}>
        <span className="adequacy__level">{LEVEL_LABEL[adequacy.level]}</span>
        <span>
          {adequacy.summary}
          {adequacy.nextThreshold !== null ? (
            <>
              {" "}
              {adequacy.nextThreshold - count} more unlocks {adequacy.nextUnlocks}.
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}
