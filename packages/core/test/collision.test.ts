import { describe, expect, it } from "vitest";
import { CollisionEstimator } from "../src/estimators/collision.js";
import { binarize } from "../src/binarize.js";

const estimator = new CollisionEstimator();

describe("collision, specification test vector", () => {
  /**
   * The worked example in SP 800-90B section 6.3.2, reproduced end to end from
   * the published 40-bit input rather than from its intermediate values.
   */
  it("reproduces every published intermediate value for the section 6.3.2 example", () => {
    const observations = [
      1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1,
      0, 1, 0, 1, 0, 1, 1, 1, 0,
    ];
    const result = estimator.run({ alphabetSize: 2, observations });

    // Published: v = 14, X-bar = 2.7143, sigma-hat = 0.4688, X-bar' = 2.3915,
    // p = 0.7329, min-entropy = 0.4483.
    expect(result.diagnostics.runs).toBe(14);
    expect(result.diagnostics.meanRunLength as number).toBeCloseTo(2.7143, 4);
    expect(result.diagnostics.stdDev as number).toBeCloseTo(0.4688, 4);
    expect(result.diagnostics.meanLowerBound as number).toBeCloseTo(2.3915, 4);
    expect(result.diagnostics.pCollision as number).toBeCloseTo(0.7329, 4);
    // The specification prints 0.4483; the algorithm gives 0.448385, which
    // rounds to 0.4484. Every intermediate above matches to four decimals, so
    // the difference is the specification truncating its printed result.
    expect(result.bitsPerSymbol as number).toBeCloseTo(0.4484, 4);
  });

  it("reports the native binary track for binary input", () => {
    const observations = Array.from({ length: 400 }, (_, i) => (i * 7) % 2);
    expect(estimator.run({ alphabetSize: 2, observations }).diagnostics.track).toBe(
      "native-binary",
    );
  });
});

describe("collision, edge cases", () => {
  it("caps at one bit per bit when the mean exceeds the resolvable range", () => {
    // A strictly alternating bitstring has every run at length 3, so the mean
    // sits above 2.5 and section 6.3.2 step 8 applies.
    const observations = Array.from({ length: 2000 }, (_, i) => i % 2);
    const result = estimator.run({ alphabetSize: 2, observations });
    expect(result.diagnostics.usedUpperFallback).toBe(true);
    expect(result.bitsPerSymbol).toBe(1);
    expect(result.warnings.join(" ")).toMatch(/capped at one bit/);
  });

  it("reports zero bits for a constant bitstring", () => {
    // Every run is length 2, so the mean sits at the binary minimum and the
    // variance is exactly zero. The confidence term vanishes, the bound is not
    // clamped, and p solves to 1. Zero bits here is measured, not floored.
    const result = estimator.run({ alphabetSize: 2, observations: new Array(2000).fill(1) });
    expect(result.diagnostics.meanRunLength).toBe(2);
    expect(result.diagnostics.stdDev).toBe(0);
    expect(result.diagnostics.pCollision).toBe(1);
    expect(result.bitsPerSymbol).toBe(0);
  });

  it("declines rather than throwing on input too short to form runs", () => {
    const result = estimator.run({ alphabetSize: 2, observations: [1, 0] });
    expect(result.applicable).toBe(false);
    expect(result.inapplicabilityReason).toBe("insufficient-samples");
  });
});

describe("binarization of a non-power-of-two alphabet", () => {
  it("encodes a d6 at three bits per symbol", () => {
    const encoded = binarize({ alphabetSize: 6, observations: [0, 5] });
    expect(encoded.bitsPerSymbol).toBe(3);
    expect(encoded.sample.observations).toEqual([0, 0, 0, 1, 0, 1]);
  });

  it("biases the bitstring even when the source is perfectly balanced", () => {
    // Faces 0..5 encode to 000,001,010,011,100,101: seven ones in eighteen
    // bits. A fair d6 therefore yields a bitstring with a one-rate near 7/18,
    // which is a property of the encoding and not of the die.
    const balanced = Array.from({ length: 6000 }, (_, i) => i % 6);
    const encoded = binarize({ alphabetSize: 6, observations: balanced });
    expect(encoded.encodingArtifact).toBe(true);
    expect(encoded.oneRate).toBeCloseTo(7 / 18, 6);
  });

  it("reports no artifact for a power-of-two alphabet", () => {
    expect(binarize({ alphabetSize: 8, observations: [0, 7] }).encodingArtifact).toBe(false);
    expect(binarize({ alphabetSize: 2, observations: [0, 1] }).encodingArtifact).toBe(false);
  });

  it("warns when a d6 estimate is derived through the encoding", () => {
    const balanced = Array.from({ length: 3000 }, (_, i) => i % 6);
    const result = estimator.run({ alphabetSize: 6, observations: balanced });
    expect(result.diagnostics.track).toBe("bitstring");
    expect(result.warnings.join(" ")).toMatch(/not a power of two/);
  });
});

describe("collision, alphabet ceiling", () => {
  it("never reports more bits per symbol than the alphabet can carry", () => {
    // Without a ceiling this returns 3.0 for a d6: the three-bit encoding
    // scores a full bit per bit, and 3 * 1 exceeds log2(6) = 2.585. A
    // six-sided die cannot carry three bits, so the unclamped product is an
    // impossible result rather than a strong one.
    const fair = Array.from({ length: 6000 }, (_, i) => (i * 7 + 3) % 6);
    const result = estimator.run({ alphabetSize: 6, observations: fair });

    expect(result.diagnostics.scaledBeforeCeiling).toBe(3);
    expect(result.bitsPerSymbol as number).toBeCloseTo(Math.log2(6), 10);
    expect(result.diagnostics.saturated).toBe(true);
  });

  it("states that a ceiling value means nothing was found", () => {
    const fair = Array.from({ length: 6000 }, (_, i) => (i * 7 + 3) % 6);
    const result = estimator.run({ alphabetSize: 6, observations: fair });
    expect(result.warnings.join(" ")).toMatch(/found nothing/);
  });

  it("still reports below the ceiling when structure is present", () => {
    const biasedish = Array.from({ length: 6000 }, (_, i) => (i % 5 === 0 ? (i / 5) % 6 : 0));
    const result = estimator.run({ alphabetSize: 6, observations: biasedish });
    expect(result.bitsPerSymbol as number).toBeLessThan(Math.log2(6));
    expect(result.diagnostics.saturated).toBe(false);
  });
});
