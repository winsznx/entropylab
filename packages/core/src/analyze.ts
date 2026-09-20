import type {
  EntropyAnalysis,
  EntropySample,
  Estimator,
  EstimatorResult,
  TargetGuidance,
} from "./types.js";
import { assertValidSample } from "./validate.js";
import { MostCommonValueEstimator } from "./estimators/most-common-value.js";
import { CollisionEstimator } from "./estimators/collision.js";
import { MarkovEstimator } from "./estimators/markov.js";
import { LagPredictorEstimator } from "./estimators/lag.js";

/**
 * Version of the estimator implementations.
 *
 * Every report carries this. A result is only reproducible against the code
 * that produced it, so the number must change whenever an estimator's output
 * could change for unchanged input.
 */
export const ALGORITHM_VERSION = "0.1.0";

/** Entropy targets reported by default. */
const DEFAULT_TARGETS = [128, 256];

export function defaultEstimators(): Estimator[] {
  return [
    new MostCommonValueEstimator(),
    new CollisionEstimator(),
    new MarkovEstimator(),
    new LagPredictorEstimator(),
  ];
}

export interface AnalyzeOptions {
  estimators?: Estimator[];
  targetBits?: number[];
}

/**
 * Runs the estimator suite and combines the results conservatively.
 *
 * Combination rule: the conservative figure is the lowest bits-per-symbol
 * among the estimators that were applicable to this dataset.
 *
 * The rule was checked before being adopted rather than assumed. Each
 * estimator produces a lower bound on min-entropy under its own model of how
 * the source could be predicted, and the models are not nested: frequency
 * concentration, collision behaviour, first-order transitions and fixed-offset
 * repetition are different attacks. A source is only as strong as the best
 * available attack, so the smallest bound governs. This is also the rule
 * SP 800-90B applies across its own non-IID battery.
 *
 * What the rule does not do is average, vote, or discard outliers. A single
 * estimator finding structure is sufficient evidence of structure; four
 * estimators finding nothing is not evidence of its absence, which is why a
 * result sitting at the alphabet ceiling is reported as "nothing found" rather
 * than as a clean bill of health.
 *
 * Estimators that could not run are excluded rather than counted as zero.
 * Treating an inapplicable estimator as zero bits would let an underpowered
 * sample masquerade as a detected weakness, which is the mirror image of the
 * error this product exists to prevent.
 */
export function analyze(sample: EntropySample, options: AnalyzeOptions = {}): EntropyAnalysis {
  assertValidSample(sample);

  const estimators = options.estimators ?? defaultEstimators();
  const targets = options.targetBits ?? DEFAULT_TARGETS;
  const results: EstimatorResult[] = estimators.map((estimator) => estimator.run(sample));

  const applicable = results.filter(
    (result): result is EstimatorResult & { bitsPerSymbol: number } =>
      result.applicable && typeof result.bitsPerSymbol === "number",
  );

  const warnings: string[] = [];
  const idealBitsPerSymbol = Math.log2(sample.alphabetSize);

  let conservativeBitsPerSymbol: number | undefined;
  let limitingEstimator: string | undefined;

  if (applicable.length === 0) {
    warnings.push(
      "No estimator could run on this dataset, so no entropy rate is reported. " +
        "This is a statement about the sample, not about the source.",
    );
  } else {
    const limiting = applicable.reduce((lowest, candidate) =>
      candidate.bitsPerSymbol < lowest.bitsPerSymbol ? candidate : lowest,
    );
    conservativeBitsPerSymbol = limiting.bitsPerSymbol;
    limitingEstimator = limiting.id;

    const skipped = results.filter((result) => !result.applicable);
    if (skipped.length > 0) {
      warnings.push(
        `${skipped.length} of ${results.length} estimators could not run: ` +
          `${skipped.map((result) => result.label).join(", ")}. The figure below is the ` +
          "lowest of those that did, and a method that could not run may have found " +
          "something the others missed.",
      );
    }

    if (limiting.quality === "unstable") {
      warnings.push(
        `The limiting estimator (${limiting.label}) reported an unstable result, so ` +
          "the headline figure rests on the weakest evidence in the set. Collect more " +
          "observations before relying on it.",
      );
    }

    if (conservativeBitsPerSymbol >= idealBitsPerSymbol - 1e-9) {
      warnings.push(
        "Every estimator returned the maximum for this alphabet. That means none of " +
          "them found structure, which is not the same as the source being " +
          "unpredictable. These methods do not exhaust the ways a physical process " +
          "can be predictable.",
      );
    }

    const spread = Math.max(...applicable.map((r) => r.bitsPerSymbol)) - conservativeBitsPerSymbol;
    if (spread > 0.5) {
      warnings.push(
        `The estimators disagree by ${spread.toFixed(2)} bits per symbol. Disagreement ` +
          "is expected when one method detects structure the others cannot see, and the " +
          "lowest figure governs.",
      );
    }
  }

  return {
    version: ALGORITHM_VERSION,
    sampleCount: sample.observations.length,
    alphabetSize: sample.alphabetSize,
    idealBitsPerSymbol,
    estimators: results,
    limitingEstimator,
    conservativeBitsPerSymbol,
    targetGuidance: buildTargetGuidance(targets, conservativeBitsPerSymbol),
    warnings,
  };
}

/**
 * Observations required to reach each target at the measured rate.
 *
 * Left undefined when no rate was established or when the rate is zero: a
 * process measured at zero bits per symbol cannot reach any target by being
 * repeated, and reporting an enormous count would imply otherwise.
 */
function buildTargetGuidance(
  targets: number[],
  conservativeBitsPerSymbol: number | undefined,
): TargetGuidance[] {
  return targets.map((targetBits) => {
    if (conservativeBitsPerSymbol === undefined || conservativeBitsPerSymbol <= 0) {
      return { targetBits };
    }
    return {
      targetBits,
      estimatedSamplesRequired: Math.ceil(targetBits / conservativeBitsPerSymbol),
    };
  });
}
