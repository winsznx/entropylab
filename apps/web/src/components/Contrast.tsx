import type { EntropyAnalysis } from "@entropylab/core";

/** Below this the two readings are close enough that stating a gap would overclaim. */
const MATERIAL_GAP = 0.8;

/**
 * States the product's argument on the datasets where it applies.
 *
 * Frequency analysis and the governing figure already appear on the page, but
 * a reader has to notice two numbers in different places and draw the
 * conclusion themselves. Where the gap is wide, the conclusion is written
 * out. Where it is not, this renders nothing rather than manufacturing a
 * contrast that the data does not support.
 */
export function Contrast({ analysis }: { analysis: EntropyAnalysis }): JSX.Element | null {
  const frequency = analysis.estimators.find((e) => e.id === "most-common-value");
  const frequencyBits = frequency?.applicable ? frequency.bitsPerSymbol : undefined;
  const governing = analysis.conservativeBitsPerSymbol;

  if (frequencyBits === undefined || governing === undefined) return null;
  if (frequencyBits - governing < MATERIAL_GAP) return null;

  const limiting = analysis.estimators.find((e) => e.id === analysis.limitingEstimator);
  const sequential = limiting?.id === "markov" || limiting?.id === "lag-predictor";

  return (
    <div className="contrast">
      <div className="contrast__side">
        <span className="contrast__figure">{frequencyBits.toFixed(4)}</span>
        <span className="contrast__label">
          counting outcomes
          <br />
          most common value
        </span>
      </div>
      <div className="contrast__side">
        <span className="contrast__figure contrast__figure--governing">{governing.toFixed(4)}</span>
        <span className="contrast__label">
          governing estimate
          <br />
          {limiting?.label.toLowerCase()}
        </span>
      </div>
      <p className="contrast__claim">
        {sequential
          ? `Counting the outcomes finds ${frequencyBits.toFixed(2)} bits per observation. Reading them in order finds ${governing.toFixed(2)}. Balanced counts do not make a sequence unpredictable.`
          : `The methods disagree by ${(frequencyBits - governing).toFixed(2)} bits per observation. The lowest governs, because a source is only as strong as the best attack against it.`}
      </p>
    </div>
  );
}
