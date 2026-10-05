import type { EntropyAnalysis } from "@entropylab/core";

const DESCRIPTIONS: Record<string, string> = {
  "most-common-value": "How often the commonest outcome appears. Ignores order entirely.",
  collision: "How quickly outcomes repeat, measured on a binary encoding.",
  markov: "Whether the next outcome depends on the current one.",
  "lag-predictor": "Whether any outcome repeats at a fixed distance back.",
};

/**
 * Every estimator result, including the ones that declined.
 *
 * Declined methods are listed rather than omitted. Dropping them would make a
 * sample only two methods could read look like one four methods agreed on.
 */
export function EstimatorTable({ analysis }: { analysis: EntropyAnalysis }): JSX.Element {
  return (
    <div className="scroller">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Method</th>
            <th scope="col">Bits per observation</th>
            <th scope="col">Status</th>
            <th scope="col">What it looks at</th>
          </tr>
        </thead>
        <tbody>
          {analysis.estimators.map((result) => {
            const governing = result.id === analysis.limitingEstimator;
            return (
              <tr
                key={result.id}
                data-governing={governing || undefined}
                data-declined={!result.applicable || undefined}
              >
                <td>
                  {result.label}{" "}
                  {governing ? <span className="chip chip--governing">governing</span> : null}
                </td>
                <td className="table__num">
                  {result.applicable && result.bitsPerSymbol !== undefined
                    ? result.bitsPerSymbol.toFixed(4)
                    : "declined"}
                </td>
                <td>
                  {!result.applicable ? (
                    <span className="chip chip--declined">{result.inapplicabilityReason}</span>
                  ) : result.quality === "unstable" ? (
                    <span className="chip chip--unstable">unstable</span>
                  ) : (
                    <span className="chip">usable</span>
                  )}
                </td>
                <td className="muted">{DESCRIPTIONS[result.id] ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
