import { describe, expect, it } from "vitest";
import { LagPredictorEstimator } from "../src/estimators/lag.js";
import { predictionEstimate } from "../src/estimators/predictor-framework.js";
import { MostCommonValueEstimator } from "../src/estimators/most-common-value.js";

const estimator = new LagPredictorEstimator();

/** splitmix32. Used where a test needs draws with no exploitable structure. */
function pseudoRandom(length: number, alphabet: number, seed = 7): number[] {
  let state = seed >>> 0;
  return Array.from({ length }, () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    z = (z ^ (z >>> 15)) >>> 0;
    return Math.floor((z / 4294967296) * alphabet);
  });
}

/**
 * The textbook LCG, sampled with `% alphabet` so the prediction lands on its
 * low bits. Kept deliberately: it is a realistic example of a source that
 * passes a glance and fails this estimator.
 */
function weakLinearCongruential(length: number, alphabet: number, seed = 7): number[] {
  let state = seed;
  return Array.from({ length }, () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state % alphabet;
  });
}

describe("lag predictor, structure detection", () => {
  it("identifies the exact period of a repeating sequence", () => {
    const observations = Array.from({ length: 3000 }, (_, i) => i % 6);
    const result = estimator.run({ alphabetSize: 6, observations });

    // The diagnostic a user acts on: the period is named, not just scored.
    expect(result.diagnostics.winningLag).toBe(6);
    expect(result.bitsPerSymbol as number).toBeLessThan(0.01);
  });

  it("identifies lag one for a source that repeats its previous symbol", () => {
    let state = 0;
    let seed = 99;
    const observations = [0];
    for (let i = 1; i < 3000; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      state = seed / 0x7fffffff < 0.6 ? (observations[i - 1] as number) : seed % 6;
      observations.push(state);
    }
    const result = estimator.run({ alphabetSize: 6, observations });

    expect(result.diagnostics.winningLag).toBe(1);
    expect(result.bitsPerSymbol as number).toBeLessThan(1.2);
  });

  it("finds nothing in a memoryless sequence", () => {
    const result = estimator.run({ alphabetSize: 6, observations: pseudoRandom(3000, 6) });
    // Success rate should sit near the 1/6 a guesser achieves.
    expect(result.diagnostics.pGlobal as number).toBeLessThan(0.22);
    expect(result.bitsPerSymbol as number).toBeGreaterThan(2.1);
  });

  it("understates a defect that lives only in the marginals", () => {
    // Independent draws from a skewed distribution, so the only defect is in
    // the histogram. The lag predictor is not blind to this, because guessing
    // a repeat succeeds at rate sum(p_i^2), which rises with bias. It is
    // simply the weaker instrument for it, and reports a higher number than
    // the frequency estimator on the same data.
    //
    // This is why the pipeline reports the minimum across methods rather than
    // trusting any single one: each estimator understates the defects it is
    // not built to find.
    const base = pseudoRandom(3000, 8, 5);
    const observations = base.map((v) => (v < 3 ? 0 : v % 6));
    const sample = { alphabetSize: 6, observations };

    const lagBits = estimator.run(sample).bitsPerSymbol as number;
    const mcvBits = new MostCommonValueEstimator().run(sample).bitsPerSymbol as number;

    expect(lagBits).toBeGreaterThan(mcvBits);
  });

  it("flags a low-quality linear congruential generator sampled on its low bits", () => {
    // Found while writing these tests: the first draft used this generator as
    // the memoryless control and the estimator refused to call it random. It
    // was right to. An LCG taken modulo a small alphabet has short-period
    // structure in its low bits, and the lag predictor locates it.
    //
    // This is the behaviour the product is for, so it is asserted rather than
    // quietly replaced with a better generator.
    const result = estimator.run({
      alphabetSize: 6,
      observations: weakLinearCongruential(3000, 6),
    });
    expect(result.diagnostics.pGlobal as number).toBeGreaterThan(0.3);
    expect(result.bitsPerSymbol as number).toBeLessThan(2);
  });
});

describe("lag predictor, local predictability", () => {
  it("is governed by run length when a sequence is predictable only in part", () => {
    // Deterministic for the first half, memoryless for the second. The overall
    // success rate is unremarkable, but half the output is fully predictable.
    // Only the longest-run term reflects that, and this test exists to prove
    // the framework does not average the defect away.
    const periodic = Array.from({ length: 1500 }, (_, i) => i % 6);
    const observations = [...periodic, ...pseudoRandom(1500, 6, 31)];
    const result = estimator.run({ alphabetSize: 6, observations });

    expect(result.diagnostics.longestRun as number).toBeGreaterThan(1000);
    expect(result.diagnostics.governedBy).toBe("local");
    expect(result.diagnostics.pLocal as number).toBeGreaterThan(
      result.diagnostics.pGlobalUpper as number,
    );
    expect(result.warnings.join(" ")).toMatch(/entirely predictable/);
  });
});

describe("prediction framework", () => {
  it("floors the estimate at the alphabet ceiling when nothing is predicted", () => {
    const estimate = predictionEstimate({ attempts: 6000, correct: 0, longestRun: 0 }, 6);
    expect(estimate.governedBy).toBe("alphabet-floor");
    expect(estimate.bitsPerSymbol).toBeCloseTo(Math.log2(6), 10);
  });

  it("reports zero bits when every prediction is correct", () => {
    const estimate = predictionEstimate({ attempts: 6000, correct: 6000, longestRun: 6000 }, 6);
    expect(estimate.pGlobalUpper).toBe(1);
    expect(estimate.bitsPerSymbol).toBe(0);
  });

  it("uses the zero-success bound rather than dividing by zero", () => {
    // SP 800-90B substitutes 1 - 0.01^(1/n) when no prediction succeeded.
    const n = 1000;
    const estimate = predictionEstimate({ attempts: n, correct: 0, longestRun: 0 }, 256);
    expect(estimate.pGlobalUpper).toBeCloseTo(1 - Math.pow(0.01, 1 / n), 12);
  });
});

describe("lag predictor, applicability", () => {
  it("declines when the window cannot be scored", () => {
    const result = estimator.run({
      alphabetSize: 6,
      observations: Array.from({ length: 255 }, (_, i) => i % 6),
    });
    expect(result.applicable).toBe(false);
    expect(result.inapplicabilityReason).toBe("insufficient-samples");
  });

  it("runs at exactly twice the lag window", () => {
    const result = estimator.run({
      alphabetSize: 6,
      observations: Array.from({ length: 256 }, (_, i) => i % 6),
    });
    expect(result.applicable).toBe(true);
  });
});
