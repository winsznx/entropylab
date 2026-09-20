import type { EntropyAnalysis, EstimatorResult } from "./types.js";
import { Z_ALPHA } from "./estimators/constants.js";

/** What the analysis found, in terms a user can act on. */
export type FindingKind =
  | "frequency-bias"
  | "sequential-structure"
  | "periodicity"
  | "insufficient-data"
  | "no-structure-found";

/** What the user should do next. Exactly one is recommended per analysis. */
export type Recommendation =
  "change-procedure" | "collect-more-data" | "investigate-source" | "proceed-with-limitations";

export interface Finding {
  kind: FindingKind;
  /** One sentence naming what was observed. */
  headline: string;
  /** Why it matters for a seed ceremony. */
  detail: string;
  /** Estimator ids that support this finding. */
  evidence: string[];
}

export interface Explanation {
  findings: Finding[];
  recommendation: Recommendation;
  /** The recommendation as a sentence, in the interface's voice. */
  recommendationText: string;
  /** Why that recommendation and not another. */
  recommendationReason: string;
}

/**
 * Turns an analysis into findings and a single next step.
 *
 * Kept in the core rather than the interface so it can be tested without a
 * DOM, and so an integrator embedding the library gets the same guidance the
 * application shows.
 *
 * The output deliberately has no pass or fail state. A single green badge
 * would collapse exactly the disagreement between estimators that the analysis
 * exists to expose.
 */
export function explain(analysis: EntropyAnalysis): Explanation {
  const findings: Finding[] = [];
  const byId = new Map(analysis.estimators.map((e) => [e.id, e]));
  const declined = analysis.estimators.filter((e) => !e.applicable);
  const applicable = analysis.estimators.filter(
    (e): e is EstimatorResult & { bitsPerSymbol: number } =>
      e.applicable && typeof e.bitsPerSymbol === "number",
  );

  const ideal = analysis.idealBitsPerSymbol;
  const conservative = analysis.conservativeBitsPerSymbol;

  const frequency = byId.get("most-common-value");
  const markov = byId.get("markov");
  const lag = byId.get("lag-predictor");

  const frequencyBits = frequency?.applicable ? (frequency.bitsPerSymbol as number) : null;
  const sequentialBits = [markov, lag]
    .filter((e) => e?.applicable)
    .map((e) => e?.bitsPerSymbol as number);
  const lowestSequential = sequentialBits.length > 0 ? Math.min(...sequentialBits) : null;

  // Frequency bias, tested against sampling noise rather than against the
  // ideal rate.
  //
  // Comparing the bounded estimate to the ideal does not work: at 40
  // observations a perfectly fair d6 reports around 1.2 bits, because the
  // confidence term dominates. That is a statement about the sample size, and
  // reporting it as a biased die would be wrong. So the test is whether the
  // observed share of the most common face exceeds what chance explains at
  // this sample size, using the same 99% bound the estimator itself uses.
  const modeShare = frequency?.diagnostics.pHat as number | undefined;
  const uniformShare = 1 / analysis.alphabetSize;
  const shareExpectedByChance =
    analysis.sampleCount > 1
      ? uniformShare +
        Z_ALPHA * Math.sqrt((uniformShare * (1 - uniformShare)) / (analysis.sampleCount - 1))
      : 1;

  if (modeShare !== undefined && modeShare > shareExpectedByChance) {
    const modeSymbol = frequency?.diagnostics.modeSymbol as number | undefined;
    const share = modeShare;
    findings.push({
      kind: "frequency-bias",
      headline: "One outcome appears substantially more often than the others.",
      detail:
        `Symbol ${modeSymbol !== undefined ? modeSymbol + 1 : "?"} accounts for ` +
        `${(share * 100).toFixed(1)}% of rolls, against ${(uniformShare * 100).toFixed(1)}% for a ` +
        `balanced source. That is more than sampling noise explains at ${analysis.sampleCount} ` +
        "observations. A weighted or damaged die produces this, and more rolls will confirm the " +
        "bias rather than remove it.",
      evidence: ["most-common-value"],
    });
  }

  // Sequential structure, tested against the frequency estimate rather than
  // against the ideal rate.
  //
  // A biased source drags the sequential estimators down too, because bias
  // raises the probability of the most likely transition. Measuring the
  // sequential estimate against the ideal would therefore report every biased
  // die as also having a sequence problem, and send the user off to change a
  // procedure that is not at fault. The question this finding answers is
  // narrower: did looking at the order reveal something the counts did not?
  const SEQUENTIAL_MARGIN = 0.4;
  const sequenceLooksBad =
    lowestSequential !== null &&
    frequencyBits !== null &&
    frequencyBits - lowestSequential > SEQUENTIAL_MARGIN;
  const frequencyLooksHealthy = frequencyBits !== null && ideal - frequencyBits < 0.25;

  if (frequencyLooksHealthy && sequenceLooksBad) {
    const winningLag = lag?.diagnostics.winningLag as number | undefined;
    findings.push({
      kind: "periodicity",
      headline: "The counts look balanced, but the order is predictable.",
      detail:
        "Each outcome appears about as often as it should, so a histogram shows nothing wrong. " +
        "The sequence is another matter: knowing recent rolls makes the next one much easier to guess. " +
        (winningLag === 1
          ? "Rolls tend to repeat the previous face, which usually means the die is not tumbling."
          : winningLag !== undefined
            ? `Rolls repeat at a distance of ${winningLag}, which is a pattern in the procedure rather than in the die.`
            : ""),
      evidence: [markov, lag].filter((e) => e?.applicable).map((e) => e?.id as string),
    });
  } else if (sequenceLooksBad) {
    const winningLag = lag?.diagnostics.winningLag as number | undefined;
    findings.push({
      kind: "sequential-structure",
      headline: "The next roll is unusually predictable from the previous ones.",
      detail:
        "Outcomes depend on what came before, so the sequence carries less unpredictability than the counts suggest. " +
        (winningLag === 1
          ? "The strongest pattern is repetition of the previous face."
          : winningLag !== undefined
            ? `The strongest pattern repeats at a distance of ${winningLag}.`
            : ""),
      evidence: [markov, lag].filter((e) => e?.applicable).map((e) => e?.id as string),
    });
  }

  if (declined.length > 0) {
    findings.push({
      kind: "insufficient-data",
      headline: `${declined.length} of ${analysis.estimators.length} methods could not run on this sample.`,
      detail:
        `${declined.map((e) => e.label).join(" and ")} need more observations than this sample ` +
        "contains. A method that did not run may have found something the others missed, so the " +
        "figure below rests on less evidence than it appears to.",
      evidence: declined.map((e) => e.id),
    });
  }

  const unstableLimiting =
    analysis.limitingEstimator !== undefined &&
    byId.get(analysis.limitingEstimator)?.quality === "unstable";

  if (findings.length === 0 && conservative !== undefined) {
    findings.push({
      kind: "no-structure-found",
      headline: "These methods found no structure in this sample.",
      detail:
        "That is not the same as the source being unpredictable. Four methods do not exhaust the " +
        "ways a physical process can be predictable, and a sample this size cannot rule out a " +
        "weak pattern.",
      evidence: applicable.map((e) => e.id),
    });
  }

  const { recommendation, recommendationText, recommendationReason } = recommend({
    findings,
    declinedCount: declined.length,
    unstableLimiting,
    conservative,
    ideal,
  });

  return { findings, recommendation, recommendationText, recommendationReason };
}

function recommend(input: {
  findings: Finding[];
  declinedCount: number;
  unstableLimiting: boolean;
  conservative: number | undefined;
  ideal: number;
}): Pick<Explanation, "recommendation" | "recommendationText" | "recommendationReason"> {
  const kinds = new Set(input.findings.map((f) => f.kind));

  // Sequence structure is a property of how the process is operated, so more
  // data from the same procedure confirms it rather than fixing it. This is
  // checked first because it is the one case where collecting more would be
  // actively wrong advice.
  if (kinds.has("periodicity") || kinds.has("sequential-structure")) {
    return {
      recommendation: "change-procedure",
      recommendationText: "Change how you roll before using this process for a seed.",
      recommendationReason:
        "The pattern is in the procedure, not in the sample size. Rolling more the same way " +
        "will confirm it rather than remove it. Shake longer, use a cup, change the surface, " +
        "then calibrate again.",
    };
  }

  if (kinds.has("frequency-bias")) {
    return {
      recommendation: "investigate-source",
      recommendationText: "Check the die itself before using this process for a seed.",
      recommendationReason:
        "The imbalance is in the outcomes rather than their order, which points at the die: " +
        "weighting, a chipped edge, or rounded corners. Try a different die and calibrate again.",
    };
  }

  if (kinds.has("insufficient-data") || input.unstableLimiting) {
    return {
      recommendation: "collect-more-data",
      recommendationText: "Collect more observations before relying on this result.",
      recommendationReason:
        input.declinedCount > 0
          ? "Some methods could not run at this sample size, so the result rests on fewer checks " +
            "than it looks like. Nothing here says the process is bad; there is not yet enough " +
            "evidence to say much at all."
          : "The method producing the headline figure flagged its own result as unstable at this " +
            "sample size. More observations will narrow it.",
    };
  }

  return {
    recommendation: "proceed-with-limitations",
    recommendationText: "You can proceed, with the limitations stated below.",
    recommendationReason:
      "No method found structure in this sample. That is the best evidence these checks can " +
      "give, and it is not proof of unpredictability. Use the observation count below as a " +
      "target, and do not reuse these calibration rolls as seed material.",
  };
}
