import { describe, expect, it } from "vitest";
import { MostCommonValueEstimator } from "@entropylab/core";
import { fairLike, periodicBalanced, biased } from "../src/index.js";

const mcv = new MostCommonValueEstimator();
const bits = (sample: Parameters<typeof mcv.run>[0]): number =>
  mcv.run(sample).bitsPerSymbol as number;

/**
 * Half of the project thesis, asserted against the estimator rather than
 * argued in prose. The other half, that sequential analysis catches what this
 * misses, is asserted once the sequential estimators exist.
 */
describe("frequency analysis cannot see sequence structure", () => {
  it("rates a fully deterministic sequence above a genuinely fair one", () => {
    // PERIODIC_BALANCED is 0,1,2,3,4,5 repeating: the next symbol is knowable
    // with certainty. FAIR_LIKE is genuinely unpredictable. The most common
    // value estimate prefers the deterministic source, because its histogram
    // is exactly uniform while a real random draw has sampling noise.
    //
    // If a future change makes this assertion fail, the estimator has stopped
    // matching SP 800-90B section 6.3.1 rather than improved.
    expect(bits(periodicBalanced())).toBeGreaterThan(bits(fairLike()));
  });

  it("reports the deterministic sequence as close to the d6 ideal", () => {
    const ideal = Math.log2(6);
    expect(ideal - bits(periodicBalanced())).toBeLessThan(0.11);
  });

  it("still detects a defect that lives in the marginals", () => {
    // The method is not useless: it is specifically blind to order, and a
    // frequency defect is caught decisively.
    expect(bits(biased())).toBeLessThan(bits(fairLike()) - 0.9);
  });
});
