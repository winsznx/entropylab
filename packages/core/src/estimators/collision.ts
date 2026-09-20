import type { Estimator, EntropySample, EstimatorResult } from "../types.js";
import { binarize } from "../binarize.js";
import { Z_ALPHA } from "./constants.js";

/**
 * Below this many collision runs the sample standard deviation is too noisy to
 * support the confidence bound. EntropyLab's own threshold; SP 800-90B assumes
 * L near 10^6 throughout and states no explicit minimum.
 */
const UNSTABLE_BELOW_RUNS = 100;

/**
 * Collision estimate, SP 800-90B section 6.3.2.
 *
 * The specification restricts this method to binary inputs, and the
 * restriction is structural rather than cosmetic: with a two-symbol alphabet a
 * collision run is always length 2 or 3, which is what makes the closed-form
 * solution below valid. A d6 sequence is therefore binarised first, per
 * section 3.1.3, and the result is reported in bits per encoded bit. The
 * caller is responsible for knowing that a bitstring-derived figure measures
 * the source and the chosen encoding together.
 *
 * Computation follows the NIST reference implementation rather than the
 * literal text of step 7. The specification describes a binary search for p
 * against F(1/z) = Gamma(3,z) * z^-3 * e^z; the reference implementation
 * (cpp/non_iid/collision_test.h) notes that the expression simplifies to
 * X' = -2p^2 + 2p + 2 and solves it with the quadratic formula, taking the
 * root above 1/2. The two are equivalent by NIST's own derivation, and the
 * closed form is used here so that results are comparable with the reference
 * tool without a solver in the loop.
 */
export class CollisionEstimator implements Estimator {
  readonly id = "collision";
  readonly label = "Collision";

  run(sample: EntropySample): EstimatorResult {
    const isBinary = sample.alphabetSize === 2;
    const encoded = isBinary ? null : binarize(sample);
    const bits = encoded ? encoded.sample.observations : sample.observations;
    const warnings: string[] = [];

    if (bits.length < 4) {
      return {
        id: this.id,
        label: this.label,
        applicable: false,
        quality: "not-applicable",
        inapplicabilityReason: "insufficient-samples",
        warnings: ["Too few bits to observe a collision run."],
        diagnostics: { bitCount: bits.length },
      };
    }

    // Walk the bitstring, cutting a run at each repeat. With a binary alphabet
    // a run is length 2 (xx) or length 3 (xyx or xyy), so the run length can be
    // read directly instead of searched for.
    let runs = 0;
    let consumed = 0;
    let sumSquares = 0;
    let i = 0;
    while (i < bits.length - 1) {
      let runLength: number;
      if (bits[i] === bits[i + 1]) {
        runLength = 2;
      } else if (i < bits.length - 2) {
        runLength = 3;
      } else {
        break;
      }
      runs += 1;
      sumSquares += runLength * runLength;
      consumed += runLength;
      i += runLength;
    }

    if (runs < 2) {
      return {
        id: this.id,
        label: this.label,
        applicable: false,
        quality: "not-applicable",
        inapplicabilityReason: "insufficient-samples",
        warnings: ["At least two collision runs are required to estimate a variance."],
        diagnostics: { bitCount: bits.length, runs },
      };
    }

    const meanRunLength = consumed / runs;
    const variance = (sumSquares - consumed * meanRunLength) / (runs - 1);
    const stdDev = Math.sqrt(Math.max(0, variance));
    const rawLowerBound = meanRunLength - (Z_ALPHA * stdDev) / Math.sqrt(runs);

    // The valid domain of the closed form is a mean run length in [2, 2.5].
    // Below 2 is impossible for a binary sequence and is clamped; above 2.5 the
    // quadratic has no real root, which is the case section 6.3.2 step 8
    // resolves by reporting the maximum of one bit per bit.
    const meanBound = Math.max(2, rawLowerBound);
    let bitsPerEncodedBit: number;
    let pCollision: number;
    let sawUpperFallback = false;

    if (meanBound < 2.5) {
      pCollision = 0.5 + Math.sqrt(1.25 - 0.5 * meanBound);
      bitsPerEncodedBit = Math.max(0, -Math.log2(pCollision));
    } else {
      pCollision = 0.5;
      bitsPerEncodedBit = 1;
      sawUpperFallback = true;
      warnings.push(
        "Mean collision time exceeded the range the method can resolve, so the " +
          "estimate is capped at one bit per bit rather than measured.",
      );
    }

    if (rawLowerBound < 2) {
      warnings.push(
        "The confidence-adjusted mean collision time fell below the minimum " +
          "possible for a binary sequence and was clamped, so this estimate is a " +
          "floor rather than a measurement.",
      );
    }
    if (runs < UNSTABLE_BELOW_RUNS) {
      warnings.push(
        `Only ${runs} collision runs were observed. The variance term is unreliable ` +
          "at this size; treat the result as indicative.",
      );
    }

    // Convert back to the source alphabet. Section 3.1.3 combines as
    // n * H_bitstring, where n is bits per sample.
    //
    // That product is capped at log2(k) here, and the cap is load-bearing. A
    // fair d6 encoded in three bits yields a bitstring the collision method
    // scores at the full one bit per bit, and 3 * 1 = 3 bits per symbol, which
    // is more than a six-sided die can carry. SP 800-90B never publishes such
    // a value because its section 3.1.3 rule immediately takes the minimum
    // against the symbol-alphabet estimate, which is bounded by log2(k). An
    // estimator reporting a figure above the alphabet ceiling in isolation
    // would be reporting an impossibility, so the ceiling is applied here and
    // the saturation is recorded rather than hidden.
    const scale = encoded ? encoded.bitsPerSymbol : 1;
    const ceiling = Math.log2(sample.alphabetSize);
    const scaled = bitsPerEncodedBit * scale;
    const bitsPerSymbol = Math.min(scaled, ceiling);
    const saturated = scaled >= ceiling;

    if (saturated) {
      warnings.push(
        "This method found no exploitable collision structure, so the estimate " +
          `sits at the ${ceiling.toFixed(3)} bit ceiling for a ${sample.alphabetSize}-symbol ` +
          "alphabet. A ceiling value means this estimator found nothing, not that " +
          "the source was shown to be strong.",
      );
    }

    if (encoded?.encodingArtifact) {
      warnings.push(
        `This estimate is computed over a ${encoded.bitsPerSymbol}-bit encoding of a ` +
          `${sample.alphabetSize}-symbol alphabet. Because ${sample.alphabetSize} is not a ` +
          `power of two, unreachable codewords bias the bitstring (observed one-rate ` +
          `${encoded.oneRate.toFixed(4)}) independently of the source. The figure ` +
          "describes the source and this encoding together, not the source alone.",
      );
    }

    return {
      id: this.id,
      label: this.label,
      applicable: true,
      bitsPerSymbol,
      quality: runs < UNSTABLE_BELOW_RUNS ? "unstable" : "usable",
      warnings,
      diagnostics: {
        track: isBinary ? "native-binary" : "bitstring",
        bitCount: bits.length,
        runs,
        meanRunLength,
        stdDev,
        meanLowerBound: rawLowerBound,
        clampedMeanBound: meanBound,
        pCollision,
        bitsPerEncodedBit,
        scaledBeforeCeiling: scaled,
        alphabetCeiling: ceiling,
        saturated,
        encodingWidth: scale,
        encodingOneRate: encoded?.oneRate,
        usedUpperFallback: sawUpperFallback,
      },
    };
  }
}
