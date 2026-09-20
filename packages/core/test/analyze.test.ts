import { describe, expect, it } from "vitest";
import { analyze, ALGORITHM_VERSION } from "../src/analyze.js";
import type { Estimator, EstimatorResult } from "../src/types.js";

function stubEstimator(id: string, bitsPerSymbol: number | null, overrides = {}): Estimator {
  return {
    id,
    label: id,
    run: (): EstimatorResult => ({
      id,
      label: id,
      applicable: bitsPerSymbol !== null,
      ...(bitsPerSymbol !== null ? { bitsPerSymbol } : {}),
      quality: bitsPerSymbol !== null ? "usable" : "not-applicable",
      ...(bitsPerSymbol === null ? { inapplicabilityReason: "insufficient-samples" as const } : {}),
      warnings: [],
      diagnostics: {},
      ...overrides,
    }),
  };
}

const sample = { alphabetSize: 6, observations: Array.from({ length: 600 }, (_, i) => i % 6) };

describe("conservative combination", () => {
  it("reports the lowest applicable estimate and names its source", () => {
    const analysis = analyze(sample, {
      estimators: [
        stubEstimator("high", 2.5),
        stubEstimator("low", 0.4),
        stubEstimator("mid", 1.8),
      ],
    });
    expect(analysis.conservativeBitsPerSymbol).toBe(0.4);
    expect(analysis.limitingEstimator).toBe("low");
  });

  it("excludes inapplicable estimators instead of counting them as zero", () => {
    // Counting a method that could not run as zero bits would turn an
    // underpowered sample into a detected weakness, which is the mirror image
    // of the error this product exists to prevent.
    const analysis = analyze(sample, {
      estimators: [stubEstimator("ran", 2.2), stubEstimator("declined", null)],
    });
    expect(analysis.conservativeBitsPerSymbol).toBe(2.2);
    expect(analysis.limitingEstimator).toBe("ran");
  });

  it("warns that a method which could not run may have found something", () => {
    const analysis = analyze(sample, {
      estimators: [stubEstimator("ran", 2.2), stubEstimator("declined", null)],
    });
    expect(analysis.warnings.join(" ")).toMatch(/could not run/);
  });

  it("reports no rate at all when nothing could run", () => {
    const analysis = analyze(sample, {
      estimators: [stubEstimator("a", null), stubEstimator("b", null)],
    });
    expect(analysis.conservativeBitsPerSymbol).toBeUndefined();
    expect(analysis.limitingEstimator).toBeUndefined();
    expect(analysis.warnings.join(" ")).toMatch(/statement about the sample/);
  });

  it("flags when the headline rests on an unstable result", () => {
    const analysis = analyze(sample, {
      estimators: [
        stubEstimator("solid", 2.4),
        stubEstimator("shaky", 0.9, { quality: "unstable" }),
      ],
    });
    expect(analysis.limitingEstimator).toBe("shaky");
    expect(analysis.warnings.join(" ")).toMatch(/weakest evidence/);
  });

  it("refuses to read a ceiling result as a clean bill of health", () => {
    const ideal = Math.log2(6);
    const analysis = analyze(sample, {
      estimators: [stubEstimator("a", ideal), stubEstimator("b", ideal)],
    });
    expect(analysis.warnings.join(" ")).toMatch(/not the same as the source being/);
  });

  it("surfaces estimator disagreement rather than hiding it", () => {
    const analysis = analyze(sample, {
      estimators: [stubEstimator("a", 2.5), stubEstimator("b", 0.2)],
    });
    expect(analysis.warnings.join(" ")).toMatch(/disagree by 2.30 bits/);
  });
});

describe("target guidance", () => {
  it("derives observation counts from the measured rate", () => {
    const analysis = analyze(sample, { estimators: [stubEstimator("only", 2)] });
    expect(analysis.targetGuidance).toEqual([
      { targetBits: 128, estimatedSamplesRequired: 64 },
      { targetBits: 256, estimatedSamplesRequired: 128 },
    ]);
  });

  it("moves when the measured rate moves", () => {
    const strong = analyze(sample, { estimators: [stubEstimator("only", 2.5)] });
    const weak = analyze(sample, { estimators: [stubEstimator("only", 0.5)] });
    const strongCount = strong.targetGuidance[0]?.estimatedSamplesRequired as number;
    const weakCount = weak.targetGuidance[0]?.estimatedSamplesRequired as number;
    expect(weakCount).toBeGreaterThan(strongCount * 4);
  });

  it("gives no count for a process measured at zero bits", () => {
    // Repeating a process that yields nothing yields nothing. A very large
    // number here would imply the target is reachable by rolling for longer.
    const analysis = analyze(sample, { estimators: [stubEstimator("dead", 0)] });
    expect(analysis.targetGuidance[0]?.estimatedSamplesRequired).toBeUndefined();
  });

  it("honours custom targets", () => {
    const analysis = analyze(sample, {
      estimators: [stubEstimator("only", 2)],
      targetBits: [64],
    });
    expect(analysis.targetGuidance).toEqual([{ targetBits: 64, estimatedSamplesRequired: 32 }]);
  });
});

describe("analysis metadata", () => {
  it("records the algorithm version and sample shape", () => {
    const analysis = analyze(sample);
    expect(analysis.version).toBe(ALGORITHM_VERSION);
    expect(analysis.sampleCount).toBe(600);
    expect(analysis.alphabetSize).toBe(6);
    expect(analysis.idealBitsPerSymbol).toBeCloseTo(Math.log2(6), 12);
  });

  it("retains every estimator result, including ones that declined", () => {
    const analysis = analyze({ alphabetSize: 6, observations: [0, 1, 2, 3, 4, 5] });
    expect(analysis.estimators).toHaveLength(4);
    expect(analysis.estimators.some((r) => !r.applicable)).toBe(true);
  });

  it("rejects a structurally invalid sample rather than analysing it", () => {
    expect(() => analyze({ alphabetSize: 6, observations: [] })).toThrow();
  });
});
