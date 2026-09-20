import type { EntropyAnalysis, Explanation } from "@entropylab/core";

export function Findings({ explanation }: { explanation: Explanation }): JSX.Element {
  return (
    <div>
      {explanation.findings.map((finding) => (
        <div className="finding" key={finding.kind}>
          <div className="finding__headline">{finding.headline}</div>
          <p className="finding__detail">{finding.detail}</p>
          <div className="finding__evidence">
            {finding.evidence.map((id) => (
              <span className="tag" key={id}>
                {id}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Recommendation({ explanation }: { explanation: Explanation }): JSX.Element {
  return (
    <div className={`recommend recommend--${explanation.recommendation}`}>
      <div className="recommend__text">{explanation.recommendationText}</div>
      <p className="recommend__reason">{explanation.recommendationReason}</p>
    </div>
  );
}

/**
 * Observation counts for the chosen entropy target.
 *
 * When the measured rate is zero no count is shown at all. A very large number
 * would suggest the target is reachable by rolling for longer, and for a
 * process measured at zero bits it is not reachable at any length.
 */
export function TargetGuidance({
  analysis,
  targetBits,
}: {
  analysis: EntropyAnalysis;
  targetBits: number;
}): JSX.Element {
  const rows = analysis.targetGuidance.some((g) => g.targetBits === targetBits)
    ? analysis.targetGuidance
    : [...analysis.targetGuidance, { targetBits }];

  const reachable = rows.some((g) => g.estimatedSamplesRequired !== undefined);

  if (!reachable) {
    return (
      <div className="notice notice--warn">
        No observation count is shown. At the measured rate this process does not reach any target
        by running longer, so the procedure needs to change rather than continue.
      </div>
    );
  }

  return (
    <>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Target</th>
            <th scope="col">Observations needed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((guidance) => (
            <tr key={guidance.targetBits}>
              <td>
                {guidance.targetBits} bits
                {guidance.targetBits === targetBits ? (
                  <span className="tag tag--governing" style={{ marginLeft: 8 }}>
                    your target
                  </span>
                ) : null}
              </td>
              <td className="table__num">
                {guidance.estimatedSamplesRequired ?? "not reachable at this rate"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="field__hint">
        These counts follow from this calibration sample at the measured rate. They are guidance
        about a process that behaved this way once, not a guarantee about rolls you have not made.
      </p>
    </>
  );
}

export function Warnings({ analysis }: { analysis: EntropyAnalysis }): JSX.Element | null {
  const perEstimator = analysis.estimators.flatMap((estimator) =>
    estimator.warnings.map((warning) => ({ label: estimator.label, warning })),
  );

  if (analysis.warnings.length === 0 && perEstimator.length === 0) return null;

  return (
    <ul className="warning-list">
      {analysis.warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
      {perEstimator.map(({ label, warning }) => (
        <li key={`${label}:${warning}`}>
          <strong>{label}:</strong> {warning}
        </li>
      ))}
    </ul>
  );
}
