import { symbolCounts, type EntropySample } from "@entropylab/core";

interface Props {
  sample: EntropySample;
  labels: string[];
}

/**
 * Symbol frequency, with the balanced share marked.
 *
 * This chart exists to be unconvincing on the periodic fixture. A user looking
 * at a perfectly flat histogram beside a governing estimate of zero learns more
 * than either would teach alone, which is the only reason it earns space.
 */
export function Histogram({ sample, labels }: Props): JSX.Element {
  const counts = symbolCounts(sample);
  const total = sample.observations.length;
  const largest = Math.max(...counts, 1);
  const expectedShare = 1 / sample.alphabetSize;

  return (
    <div className="histogram">
      {counts.map((count, symbol) => {
        const share = total === 0 ? 0 : count / total;
        return (
          <div className="histogram__row" key={symbol}>
            <span>{labels[symbol] ?? symbol + 1}</span>
            <div className="histogram__bar">
              <div className="histogram__fill" style={{ width: `${(count / largest) * 100}%` }} />
              <div
                className="histogram__expected"
                style={{ left: `${(expectedShare * total * 100) / largest}%` }}
                title="balanced share"
              />
            </div>
            <span>{(share * 100).toFixed(1)}%</span>
          </div>
        );
      })}
      <p className="field__hint">
        The vertical rule marks the {(expectedShare * 100).toFixed(1)}% each outcome would take from
        a balanced source. A flat histogram says nothing about the order of the rolls.
      </p>
    </div>
  );
}
