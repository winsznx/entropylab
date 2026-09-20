import type { Estimator, EntropySample, EstimatorResult } from "../types.js";
import { predictionEstimate } from "./predictor-framework.js";

/**
 * Number of lags tracked in parallel.
 *
 * SP 800-90B section 6.3.8 fixes D = 128. The value is not tuned here: a
 * threshold chosen to make a fixture look good would make every result a
 * statement about the tuning rather than about the source. 128 also bounds the
 * period this estimator can detect, which is a real limitation and is recorded
 * in the result.
 */
const LAG_WINDOW = 128;

/**
 * Lag prediction estimate, SP 800-90B section 6.3.8.
 *
 * Runs 128 predictors in parallel, one per lag distance. Predictor d guesses
 * that the next symbol equals the symbol d positions back. Each is scored as
 * the sequence is consumed, and the current best-scoring lag makes the actual
 * prediction. Accuracy is then converted to min-entropy by the shared
 * framework in predictor-framework.ts.
 *
 * Unlike the collision and Markov estimates, the specification places no
 * alphabet restriction on the predictors, so this runs directly on d6 symbols
 * with no encoding step and no generalisation. Of the four required
 * estimators, this and the most common value estimate are the two that apply
 * to dice exactly as published.
 *
 * It detects any repetition at a fixed offset within the window, which makes
 * it the natural instrument for a periodic process and for a source that
 * repeats its previous output.
 */
export class LagPredictorEstimator implements Estimator {
  readonly id = "lag-predictor";
  readonly label = "Lag predictor";

  run(sample: EntropySample): EstimatorResult {
    const { observations, alphabetSize } = sample;
    const length = observations.length;

    // Enough room for the widest lag to make a meaningful number of
    // predictions, rather than the bare two the method technically permits.
    const minimumLength = LAG_WINDOW * 2;
    if (length < minimumLength) {
      return {
        id: this.id,
        label: this.label,
        applicable: false,
        quality: "not-applicable",
        inapplicabilityReason: "insufficient-samples",
        warnings: [
          `Tracking ${LAG_WINDOW} lags needs at least ${minimumLength} observations for ` +
            `the widest lag to be scored at all. Received ${length}.`,
        ],
        diagnostics: { sampleCount: length, requiredSamples: minimumLength, lagWindow: LAG_WINDOW },
      };
    }

    const scoreboard = new Array<number>(LAG_WINDOW + 1).fill(0);
    let winningLag = 1;
    let attempts = 0;
    let correct = 0;
    let currentRun = 0;
    let longestRun = 0;

    for (let i = 1; i < length; i += 1) {
      const actual = observations[i] as number;

      // Predict with the lag that has scored best so far. Before that lag has
      // any history the predictor cannot fire, which still counts as an
      // attempt: a predictor that declines to guess has not succeeded.
      const predicted = i - winningLag >= 0 ? observations[i - winningLag] : undefined;
      attempts += 1;

      if (predicted === actual) {
        correct += 1;
        currentRun += 1;
        if (currentRun > longestRun) longestRun = currentRun;
      } else {
        currentRun = 0;
      }

      // Score every lag that would have been right, then let the best lag so
      // far take over. Ties move to the more recent lag, matching the
      // specification's update rule.
      for (let d = 1; d <= LAG_WINDOW; d += 1) {
        if (i - d < 0) break;
        if (observations[i - d] === actual) {
          scoreboard[d] = (scoreboard[d] as number) + 1;
          if ((scoreboard[d] as number) >= (scoreboard[winningLag] as number)) winningLag = d;
        }
      }
    }

    const estimate = predictionEstimate({ attempts, correct, longestRun }, alphabetSize);
    const warnings: string[] = [];

    if (!estimate.pLocalConverged) {
      warnings.push(
        "The local-predictability solve did not converge; the reported figure uses " +
          "the bisection midpoint and should be treated as approximate.",
      );
    }
    if (estimate.governedBy === "local") {
      warnings.push(
        `The estimate is governed by the longest run of correct predictions ` +
          `(${longestRun}), not by the overall success rate of ` +
          `${(estimate.pGlobal * 100).toFixed(1)}%. A source can look acceptable on ` +
          "average while containing a stretch that is entirely predictable.",
      );
    }
    if (estimate.governedBy === "alphabet-floor") {
      warnings.push(
        "No lag predicted better than chance, so the estimate sits at the ceiling " +
          "for this alphabet. That means this method found nothing, not that the " +
          "source was shown to be strong.",
      );
    }

    // Report the strongest lags, which is the diagnostic that tells a user
    // what to change about their physical process.
    const rankedLags = scoreboard
      .map((score, lag) => ({ lag, score, rate: attempts > 0 ? score / attempts : 0 }))
      .filter((entry) => entry.lag >= 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      id: this.id,
      label: this.label,
      applicable: true,
      bitsPerSymbol: estimate.bitsPerSymbol,
      quality: "usable",
      warnings,
      diagnostics: {
        sampleCount: length,
        lagWindow: LAG_WINDOW,
        attempts,
        correct,
        longestRun,
        winningLag,
        topLags: rankedLags,
        pGlobal: estimate.pGlobal,
        pGlobalUpper: estimate.pGlobalUpper,
        pLocal: estimate.pLocal,
        governedBy: estimate.governedBy,
      },
    };
  }
}
