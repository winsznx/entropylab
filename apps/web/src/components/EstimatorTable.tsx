import type { EntropyAnalysis } from "@entropylab/core";
import { AUTHORITY_LABEL, METHOD_NOTES } from "../methods.js";

/**
 * Every estimator result, with how much authority each one carries.
 *
 * Declined methods are listed rather than omitted: dropping them would make a
 * sample only two methods could read look like one four methods agreed on.
 * The authority column exists because a table of four equal-looking numbers
 * implies four equal-looking pedigrees, and two of these are not the
 * published algorithm.
 */
export function EstimatorTable({ analysis }: { analysis: EntropyAnalysis }): JSX.Element {
  return (
    <div className="scroller">
      <table className="table methods-table">
        <thead>
          <tr>
            <th scope="col">Method</th>
            <th scope="col">Bits per observation</th>
            <th scope="col">Status</th>
            <th scope="col">Methodology</th>
            <th scope="col">What it tests</th>
          </tr>
        </thead>
        <tbody>
          {analysis.estimators.map((result) => {
            const governing = result.id === analysis.limitingEstimator;
            const note = METHOD_NOTES[result.id];
            return (
              <tr
                key={result.id}
                data-governing={governing || undefined}
                data-declined={!result.applicable || undefined}
              >
                <th scope="row">
                  <span className="methods-table__name">{result.label}</span>
                  {governing ? <span className="chip chip--governing">governing</span> : null}
                </th>
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
                <td>
                  {note ? (
                    <span className={`chip chip--authority-${note.authority}`}>
                      {AUTHORITY_LABEL[note.authority]}
                    </span>
                  ) : null}
                </td>
                <td className="muted">
                  {note?.tests}
                  {note ? <span className="methods-table__caveat">{note.caveat}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
