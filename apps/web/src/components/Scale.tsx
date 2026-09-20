import type { EntropyAnalysis } from "@entropylab/core";

interface Props {
  analysis: EntropyAnalysis;
  caption?: string;
}

/**
 * The measurement scale: the product's argument rendered as an instrument.
 *
 * One axis runs from zero to the ideal rate for the alphabet. Each estimator
 * that produced a figure is a tick on it, and the governing value is a hard
 * stop. Everything to the right of that stop is hatched rather than filled,
 * because it is territory some method claimed and another method contradicted.
 *
 * On a periodic source the picture carries the whole point on its own: a tick
 * sits at 2.48 near the right edge, and the governing mark reads zero.
 */
export function Scale({ analysis, caption }: Props): JSX.Element {
  const ideal = analysis.idealBitsPerSymbol;
  const conservative = analysis.conservativeBitsPerSymbol;
  const percent = (value: number): number => Math.max(0, Math.min(100, (value / ideal) * 100));

  const ticks = analysis.estimators
    .filter((e) => e.applicable && typeof e.bitsPerSymbol === "number")
    .map((e) => ({
      id: e.id,
      label: e.label,
      value: e.bitsPerSymbol as number,
      governing: e.id === analysis.limitingEstimator,
    }))
    .sort((a, b) => a.value - b.value);

  const supportedWidth = conservative === undefined ? 0 : percent(conservative);

  // Estimators that land close together would overprint their labels, which
  // happens exactly when the result is most interesting: a collapsed source
  // puts several methods near zero. Close ticks are dropped to a second row
  // rather than shortened, so no figure is lost.
  const MIN_SEPARATION = 7;
  let lastLabelled = -Infinity;
  const placed = ticks.map((tick) => {
    const position = percent(tick.value);
    const stacked = position - lastLabelled < MIN_SEPARATION;
    if (!stacked) lastLabelled = position;
    return { ...tick, position, stacked };
  });

  return (
    <div className="scale">
      <div className="scale__head">
        <div>
          {conservative === undefined ? (
            <div className="scale__value">
              no result
              <span className="scale__unit">no method could run</span>
            </div>
          ) : (
            <div
              className={`scale__value${conservative < 0.01 ? " scale__value--zero" : ""}`}
              aria-describedby="scale-desc"
            >
              {conservative.toFixed(4)}
              <span className="scale__unit">bits per observation</span>
            </div>
          )}
        </div>
        <div className="scale__limit">
          ideal for {analysis.alphabetSize} outcomes
          <br />
          <strong>{ideal.toFixed(4)}</strong>
        </div>
      </div>

      <div className="scale__track">
        <div className="scale__inner">
          <div className="scale__bed">
            <div className="scale__supported" style={{ width: `${supportedWidth}%` }} />
            <div className="scale__unsupported" style={{ left: `${supportedWidth}%`, right: 0 }} />
          </div>

          {placed.map((tick) => (
            <div
              key={tick.id}
              className={[
                "scale__tick",
                tick.governing ? "scale__tick--governing" : "",
                tick.stacked ? "scale__tick--stacked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ left: `${tick.position}%` }}
            >
              <div className="scale__tick-mark" />
              <div className="scale__tick-label">
                {tick.value.toFixed(2)}
                <span className="visually-hidden">
                  {" "}
                  bits per observation from {tick.label}
                  {tick.governing ? ", the governing method" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="scale__caption" id="scale-desc">
        {caption ??
          (conservative === undefined
            ? "No estimator could run on this sample, so no rate is reported. That is a statement about the sample, not the source."
            : ticks.length > 1
              ? `${ticks.length} methods ran and returned figures from ${ticks[0]?.value.toFixed(2)} to ${ticks[ticks.length - 1]?.value.toFixed(2)}. The lowest governs; the hatched region is what the other methods claimed and this one contradicts.`
              : "One method ran. The hatched region is untested rather than ruled out.")}
      </p>
    </div>
  );
}
