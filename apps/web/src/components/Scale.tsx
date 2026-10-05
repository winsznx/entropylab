import { useEffect, useRef, useState } from "react";
import type { EntropyAnalysis } from "@entropylab/core";

interface Props {
  analysis: EntropyAnalysis;
  caption?: string;
  /** Suppresses the count-up where the figure is secondary to its surroundings. */
  still?: boolean;
}

/**
 * The measurement scale: the product's argument rendered as an instrument.
 *
 * One axis from zero to the ideal rate for the alphabet. Each estimator that
 * produced a figure is a tick on it, the governing value is a hard stop, and
 * the territory past that stop is hatched rather than filled, because it is
 * ground one method claimed and another contradicted.
 *
 * This carries the only choreographed motion in the product: the supported
 * region sweeps out while the figure counts up to meet it, then the ticks
 * fade in. It is here and nowhere else because this is the moment the reading
 * is delivered, and a needle settling is what an instrument does.
 */
export function Scale({ analysis, caption, still = false }: Props): JSX.Element {
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

  // Ticks that land close together would overprint their labels, which happens
  // exactly when the result is most interesting: a collapsed source puts
  // several methods near zero. Close ticks drop to a second row rather than
  // being dropped or shortened, so no figure is lost.
  const MIN_SEPARATION = 7;
  let lastLabelled = -Infinity;
  const placed = ticks.map((tick) => {
    const position = percent(tick.value);
    const stacked = position - lastLabelled < MIN_SEPARATION;
    if (!stacked) lastLabelled = position;
    return { ...tick, position, stacked };
  });

  const supportedWidth = conservative === undefined ? 0 : percent(conservative);
  const shown = useCountUp(conservative, still);

  return (
    <div>
      <div className="reading-head">
        <div>
          {conservative === undefined ? (
            <>
              <span className="figure figure--absent">no reading</span>
              <span className="figure-unit">no method could run on this sample</span>
            </>
          ) : (
            <>
              <span className={`figure${conservative < 0.005 ? " figure--collapsed" : ""}`}>
                {shown.toFixed(4)}
              </span>
              <span className="figure-unit">bits per observation, conservative estimate</span>
            </>
          )}
        </div>
        <div className="ceiling">
          ideal for {analysis.alphabetSize} outcomes
          <strong>{ideal.toFixed(4)}</strong>
        </div>
      </div>

      <div className="scale">
        <div className="scale__inner">
          <div className="scale__bed">
            <div className="scale__supported" style={{ width: `${supportedWidth}%` }} />
            <div className="scale__contradicted" style={{ left: `${supportedWidth}%`, right: 0 }} />
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

      <p className="scale__caption">
        {caption ??
          (conservative === undefined
            ? "No estimator could run on this sample, so no rate is reported. That is a statement about the sample, not about the source."
            : placed.length > 1
              ? `${placed.length} methods ran and returned figures from ${placed[0]?.value.toFixed(2)} to ${placed[placed.length - 1]?.value.toFixed(2)}. The lowest governs; the hatched region is what the other methods claimed and this one contradicts.`
              : "One method ran. The hatched region is untested rather than ruled out.")}
      </p>
    </div>
  );
}

/**
 * Counts a figure up to its value over the same duration the bar sweeps.
 *
 * Eased to match the bar rather than run linearly, so the number and the bar
 * arrive together. Honours reduced motion by showing the value immediately:
 * a count-up is decorative movement, and the person has asked for none.
 */
function useCountUp(target: number | undefined, still: boolean): number {
  const [value, setValue] = useState(target ?? 0);
  const frame = useRef(0);

  useEffect(() => {
    if (target === undefined) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || still) {
      setValue(target);
      return undefined;
    }

    const duration = 900;
    const start = performance.now();
    const tick = (now: number): void => {
      // Clamped at both ends. A requestAnimationFrame timestamp is the start
      // of the frame and can predate the performance.now() captured just
      // before it, which made the elapsed fraction negative, the easing
      // negative with it, and the reading render as a negative number of
      // bits for one frame.
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      // Matches --ease-instrument, so the digits settle with the bar.
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, still]);

  return target === undefined ? 0 : value;
}
