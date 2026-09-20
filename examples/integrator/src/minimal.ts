/**
 * The smallest useful EntropyLab integration.
 *
 * Everything below the imports is the integration. It is the same entry point
 * the EntropyLab application itself calls; there is no separate embedding API.
 */
import { analyze, explain } from "@entropylab/core";

/** Dice faces as a wallet would hold them, one-based. */
const rolls = [3, 1, 6, 2, 5, 4, 1, 3, 6, 2, 4, 5, 2, 6, 1, 4, 3, 5, 6, 1];

export function profileDiceProcess(faces: number[], sides: number, targetBits: number) {
  const analysis = analyze(
    // Observations are zero-based symbol ids; faces a person reads are one-based.
    { alphabetSize: sides, observations: faces.map((face) => face - 1) },
    { targetBits: [targetBits] },
  );

  const limiting = analysis.estimators.find((e) => e.id === analysis.limitingEstimator);
  const guidance = analysis.targetGuidance[0];

  return {
    bitsPerRoll: analysis.conservativeBitsPerSymbol,
    limitedBy: limiting?.label,
    rollsNeeded: guidance?.estimatedSamplesRequired,
    declined: analysis.estimators.filter((e) => !e.applicable).map((e) => e.label),
    warnings: analysis.warnings,
    nextStep: explain(analysis).recommendationText,
  };
}

// Running this file directly prints the result. Twenty rolls is deliberately
// too few: it shows the shape an integrator must handle, where two methods
// decline and the library refuses to sound confident.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(profileDiceProcess(rolls, 6, 128));
}
