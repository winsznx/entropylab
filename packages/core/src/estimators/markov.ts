import type { Estimator, EntropySample, EstimatorResult } from "../types.js";
import { Z_ALPHA } from "./constants.js";

/**
 * Length of the hypothetical output chain whose probability is maximised.
 *
 * SP 800-90B section 6.3.3 fixes this at 128 and normalises the result by the
 * same figure. The constant is kept here for both the binary and the
 * generalised path so the two remain directly comparable.
 */
const CHAIN_LENGTH = 128;

/**
 * Minimum observed transitions out of a state before its row is treated as
 * measured. Below this the row is still used, but the result is marked
 * unstable, because a row estimated from a handful of transitions produces a
 * confidence bound wide enough to dominate the path probability.
 */
const MIN_ROW_TRANSITIONS = 30;

/**
 * Markov estimate.
 *
 * SP 800-90B section 6.3.3 restricts this method to binary inputs and fixes a
 * 2x2 transition matrix, enumerating six candidate chains. Dice are not
 * binary, and routing them through the section 3.1.3 bitstring conversion
 * would destroy the symbol-level transition structure this estimator exists to
 * find: the dependency in a d6 process is between faces, not between the bits
 * of their encoding.
 *
 * This implementation therefore generalises to a k x k transition matrix and
 * searches for the most probable chain by dynamic programming. That structure
 * is not invented here. The second draft of SP 800-90B (2016) specified a
 * general-alphabet Markov estimate for alphabets up to k = 26, using a k x k
 * matrix of confidence-bounded transition probabilities and a dynamic
 * programming search for the highest-probability path. NIST removed it in the
 * January 2018 final document, citing the data required to estimate a large
 * transition matrix reliably.
 *
 * Two honest qualifications, both surfaced in the result:
 *
 * 1. This is not the estimator in the final specification, and it does not
 *    reduce to it at k = 2. The published binary method enumerates six
 *    candidate chains using raw transition proportions; this one searches all
 *    chains by dynamic programming using confidence-bounded proportions. On
 *    the same binary input the two will not agree, and this implementation
 *    will report the lower figure. The comparison is quantified in
 *    docs/METHODOLOGY.md rather than asserted here.
 * 2. The second draft's confidence term could not be recovered in full from
 *    the available source, so the bound applied to each matrix entry is the
 *    one the final document uses everywhere else: the 99% one-sided normal
 *    upper bound with Z = 2.576. Using an upper bound on every transition
 *    probability overestimates the probability of the best chain, which
 *    underestimates min-entropy. The direction of that error is conservative.
 */
export class MarkovEstimator implements Estimator {
  readonly id = "markov";
  readonly label = "Markov";

  run(sample: EntropySample): EstimatorResult {
    const { alphabetSize: k, observations } = sample;
    const length = observations.length;
    const warnings: string[] = [];

    if (length < CHAIN_LENGTH) {
      return {
        id: this.id,
        label: this.label,
        applicable: false,
        quality: "not-applicable",
        inapplicabilityReason: "insufficient-samples",
        warnings: [
          `The method maximises over a chain of ${CHAIN_LENGTH} symbols and needs at ` +
            `least that many observations. Received ${length}.`,
        ],
        diagnostics: { sampleCount: length, requiredSamples: CHAIN_LENGTH },
      };
    }

    // Initial state distribution, upper bounded.
    const stateCounts = new Array<number>(k).fill(0);
    for (const s of observations) stateCounts[s] = (stateCounts[s] as number) + 1;
    const initialUpper = stateCounts.map((c) => upperBound(c / length, length));

    // Transition counts and their row-wise upper bounds.
    const transitionCounts: number[][] = Array.from({ length: k }, () =>
      new Array<number>(k).fill(0),
    );
    for (let i = 1; i < length; i += 1) {
      const from = observations[i - 1] as number;
      const to = observations[i] as number;
      (transitionCounts[from] as number[])[to] =
        ((transitionCounts[from] as number[])[to] as number) + 1;
    }

    const transitionUpper: number[][] = [];
    const rowTotals: number[] = [];
    let sparseRows = 0;

    for (let from = 0; from < k; from += 1) {
      const row = transitionCounts[from] as number[];
      const total = row.reduce((a, b) => a + b, 0);
      rowTotals.push(total);
      if (total < MIN_ROW_TRANSITIONS) sparseRows += 1;
      transitionUpper.push(row.map((c) => (total === 0 ? 0 : upperBound(c / total, total))));
    }

    // Maximise the chain probability in log space. Working with logs keeps a
    // 128-step product from underflowing to zero, which it otherwise would.
    let logBest = initialUpper.map((p) => (p > 0 ? Math.log2(p) : -Infinity));

    for (let step = 1; step < CHAIN_LENGTH; step += 1) {
      const next = new Array<number>(k).fill(-Infinity);
      for (let from = 0; from < k; from += 1) {
        const fromScore = logBest[from] as number;
        if (fromScore === -Infinity) continue;
        const row = transitionUpper[from] as number[];
        for (let to = 0; to < k; to += 1) {
          const p = row[to] as number;
          if (p <= 0) continue;
          const candidate = fromScore + Math.log2(p);
          if (candidate > (next[to] as number)) next[to] = candidate;
        }
      }
      logBest = next;
    }

    const logMaxChain = Math.max(...logBest);

    if (!Number.isFinite(logMaxChain)) {
      return {
        id: this.id,
        label: this.label,
        applicable: false,
        quality: "not-applicable",
        inapplicabilityReason: "numerical-failure",
        warnings: [
          "No chain of the required length has positive probability under the " +
            "observed transitions. The sample is too sparse to support the method.",
        ],
        diagnostics: { sampleCount: length, transitionCounts },
      };
    }

    const ceiling = Math.log2(k);
    const bitsPerSymbol = Math.min(-logMaxChain / CHAIN_LENGTH, ceiling);

    if (k > 2) {
      warnings.push(
        `Computed over a ${k}-symbol alphabet. SP 800-90B section 6.3.3 defines the ` +
          "Markov estimate for binary inputs only; this is a documented generalisation " +
          "following the structure of the 2016 second draft, not the final method.",
      );
    }
    if (sparseRows > 0) {
      warnings.push(
        `${sparseRows} of ${k} transition rows have fewer than ${MIN_ROW_TRANSITIONS} ` +
          "observations. Those rows carry wide confidence bounds and the estimate may " +
          "move substantially with more data.",
      );
    }

    const quality: EstimatorResult["quality"] = sparseRows > 0 ? "unstable" : "usable";

    return {
      id: this.id,
      label: this.label,
      applicable: true,
      bitsPerSymbol,
      quality,
      warnings,
      diagnostics: {
        mode: k === 2 ? "specification-binary" : "generalised-alphabet",
        sampleCount: length,
        chainLength: CHAIN_LENGTH,
        transitionCounts,
        transitionUpper,
        rowTotals,
        sparseRows,
        logMaxChainProbability: logMaxChain,
        alphabetCeiling: ceiling,
      },
    };
  }
}

/** 99% one-sided upper confidence bound on a proportion. */
function upperBound(p: number, n: number): number {
  if (n <= 1) return 1;
  return Math.min(1, p + Z_ALPHA * Math.sqrt((p * (1 - p)) / (n - 1)));
}
