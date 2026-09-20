import type { EntropyAnalysis } from "@entropylab/core";

/**
 * Observed transition counts, shaded by how often each move was taken.
 *
 * Shown only when the Markov estimator ran, and only as a diagnostic: it
 * answers "which roll follows which" for a user who wants to see where the
 * structure is rather than be told it exists. A bright diagonal means the die
 * repeats itself; a bright off-diagonal band means it cycles.
 */
export function TransitionMatrix({
  analysis,
  labels,
}: {
  analysis: EntropyAnalysis;
  labels: string[];
}): JSX.Element | null {
  const markov = analysis.estimators.find((e) => e.id === "markov");
  const counts = markov?.diagnostics.transitionCounts as number[][] | undefined;
  if (!markov?.applicable || !counts) return null;

  const largest = Math.max(1, ...counts.flat());

  return (
    <div className="scroller">
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">from</span>
            </th>
            {labels.map((label) => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {counts.map((row, from) => (
            <tr key={from}>
              <th scope="row">{labels[from] ?? from + 1}</th>
              {row.map((count, to) => (
                <td
                  key={to}
                  style={{
                    background: `color-mix(in srgb, var(--measure) ${(count / largest) * 70}%, transparent)`,
                    color: count / largest > 0.6 ? "#fff" : undefined,
                  }}
                  title={`${labels[from] ?? from} then ${labels[to] ?? to}: ${count}`}
                >
                  {count}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="field__hint">
        Rows are the current outcome, columns the one that followed. A balanced process spreads
        evenly; a bright diagonal means outcomes repeat themselves.
      </p>
    </div>
  );
}
