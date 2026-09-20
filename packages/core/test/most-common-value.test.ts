import { describe, expect, it } from "vitest";
import { MostCommonValueEstimator } from "../src/estimators/most-common-value.js";

const estimator = new MostCommonValueEstimator();

describe("most common value, specification test vector", () => {
  /**
   * Worked example from SP 800-90B section 6.3.1. The specification's own prose
   * contains an arithmetic slip in the final line (it substitutes 0.6822 where
   * its stated steps give 0.6895), so this test pins the value that the
   * documented algorithm actually produces, which is also what the NIST
   * reference implementation computes.
   */
  it("reproduces the published p_u for the section 6.3.1 example", () => {
    const observations = [0, 1, 1, 2, 0, 1, 2, 2, 0, 1, 0, 1, 1, 0, 2, 2, 1, 0, 2, 1];
    const result = estimator.run({ alphabetSize: 3, observations });

    expect(result.diagnostics.modeCount).toBe(8);
    expect(result.diagnostics.pHat).toBeCloseTo(0.4, 12);
    expect(result.diagnostics.pUpper as number).toBeCloseTo(0.6895, 4);
    expect(result.bitsPerSymbol as number).toBeCloseTo(0.5364, 4);
  });
});

describe("most common value, behaviour", () => {
  it("approaches but cannot reach the ideal rate for a balanced alphabet", () => {
    // 6000 observations, exactly 1000 per face: the best case this method can
    // ever see for a d6. It still reports 2.48 rather than the 2.585 ideal,
    // because the 99% bound is applied to the observed proportion. The ~0.10
    // bit gap is the price of the confidence term at this sample size, not a
    // defect in the source, and it shrinks only as L grows.
    const observations = Array.from({ length: 6000 }, (_, i) => i % 6);
    const result = estimator.run({ alphabetSize: 6, observations });
    expect(result.bitsPerSymbol as number).toBeCloseTo(2.481, 3);
    expect(result.bitsPerSymbol as number).toBeLessThan(Math.log2(6));
  });

  it("reports zero bits for a constant source", () => {
    const result = estimator.run({ alphabetSize: 6, observations: new Array(500).fill(2) });
    expect(result.bitsPerSymbol).toBe(0);
    expect(result.warnings.join(" ")).toMatch(/certainty/);
  });

  it("never exceeds the ideal rate for the alphabet", () => {
    const observations = Array.from({ length: 12000 }, (_, i) => i % 6);
    const result = estimator.run({ alphabetSize: 6, observations });
    expect(result.bitsPerSymbol as number).toBeLessThanOrEqual(Math.log2(6));
  });

  it("is invariant under reordering", () => {
    // The defining blind spot of this method, asserted rather than assumed:
    // it cannot see sequence structure at all.
    const ordered = Array.from({ length: 600 }, (_, i) => i % 6);
    const shuffled = [...ordered].sort(() => 0.5 - ((ordered.length * 7919) % 3) / 2);
    const a = estimator.run({ alphabetSize: 6, observations: ordered });
    const b = estimator.run({ alphabetSize: 6, observations: shuffled });
    expect(a.bitsPerSymbol).toBe(b.bitsPerSymbol);
  });

  it("marks a short sample unstable while still reporting a number", () => {
    const result = estimator.run({ alphabetSize: 6, observations: [0, 1, 2, 3, 4, 5, 0, 1] });
    expect(result.applicable).toBe(true);
    expect(result.quality).toBe("unstable");
    expect(result.warnings.join(" ")).toMatch(/indicative/);
  });

  it("declines rather than throwing on a single observation", () => {
    const result = estimator.run({ alphabetSize: 6, observations: [3] });
    expect(result.applicable).toBe(false);
    expect(result.inapplicabilityReason).toBe("insufficient-samples");
    expect(result.bitsPerSymbol).toBeUndefined();
  });
});
