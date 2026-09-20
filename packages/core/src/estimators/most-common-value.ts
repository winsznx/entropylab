import type { Estimator, EntropySample, EstimatorResult } from "../types.js";
import { symbolCounts } from "../validate.js";
import { Z_ALPHA } from "./constants.js";

/**
 * Sample size below which the result is reported as unstable.
 *
 * SP 800-90B states no estimator-specific minimum for this method; its
 * assessment process assumes roughly 10^6 samples throughout. That figure is
 * unreachable in a physical dice ceremony, so this threshold is EntropyLab's
 * own choice, set where the width of the confidence term stops dominating the
 * point estimate. At L = 100 the term adds about 0.13 to p-hat for a fair d6,
 * which is already a large correction; below that the bound is mostly an
 * artefact of sample size rather than a measurement of the source.
 */
const UNSTABLE_BELOW = 100;

/**
 * Most Common Value estimate, SP 800-90B section 6.3.1.
 *
 * Applies to an arbitrary alphabet: the specification defines it over
 * A = {x_1, ..., x_k} and places no binary restriction on it, unlike the
 * collision and Markov estimates. It is therefore the one required estimator
 * that runs directly on d6 symbols with no encoding step.
 *
 * Algorithm:
 *   p_hat = max_i (count of symbol i) / L
 *   p_u   = min(1, p_hat + Z * sqrt(p_hat * (1 - p_hat) / (L - 1)))
 *   H     = -log2(p_u)
 *
 * The estimator sees only the multiset of symbols. Reordering the input cannot
 * change its output, which is exactly why it reports PERIODIC_BALANCED as
 * ideal. That blind spot is the property the sequential estimators exist to
 * cover, and it is a correct result for this method rather than a defect.
 */
export class MostCommonValueEstimator implements Estimator {
  readonly id = "most-common-value";
  readonly label = "Most common value";

  run(sample: EntropySample): EstimatorResult {
    const length = sample.observations.length;
    const warnings: string[] = [];

    if (length < 2) {
      return {
        id: this.id,
        label: this.label,
        applicable: false,
        quality: "not-applicable",
        inapplicabilityReason: "insufficient-samples",
        warnings: ["At least two observations are required to form a confidence bound."],
        diagnostics: { sampleCount: length },
      };
    }

    const counts = symbolCounts(sample);
    const modeCount = Math.max(...counts);
    const modeSymbol = counts.indexOf(modeCount);
    const pHat = modeCount / length;
    const pUpper = Math.min(1, pHat + Z_ALPHA * Math.sqrt((pHat * (1 - pHat)) / (length - 1)));
    // Clamped at zero: p_u = 1 yields -0 from Math.log2, which is a valid
    // float but a confusing value to carry into a report.
    const bitsPerSymbol = Math.max(0, -Math.log2(pUpper));

    if (length < UNSTABLE_BELOW) {
      warnings.push(
        `Only ${length} observations. The 99% confidence term contributes ` +
          `${(pUpper - pHat).toFixed(3)} to the bound, which is large relative to the ` +
          `observed proportion of ${pHat.toFixed(3)}. Treat this as indicative.`,
      );
    }
    if (pUpper >= 1) {
      warnings.push(
        "The confidence bound reaches certainty, so this estimate is zero bits by " +
          "construction rather than by measurement.",
      );
    }

    return {
      id: this.id,
      label: this.label,
      applicable: true,
      bitsPerSymbol,
      quality: length < UNSTABLE_BELOW ? "unstable" : "usable",
      warnings,
      diagnostics: {
        sampleCount: length,
        counts,
        modeSymbol,
        modeCount,
        pHat,
        pUpper,
      },
    };
  }
}
