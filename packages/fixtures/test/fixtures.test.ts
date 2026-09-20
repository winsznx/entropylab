import { describe, expect, it } from "vitest";
import { assertValidSample, symbolCounts, type EntropySample } from "@entropylab/core";
import {
  allFixtures,
  biased,
  fairLike,
  lowSample,
  periodicBalanced,
  stickyMarkov,
} from "../src/index.js";

/** Fraction of positions whose symbol equals the symbol `lag` steps earlier. */
function repeatRateAtLag(sample: EntropySample, lag: number): number {
  const { observations } = sample;
  let matches = 0;
  for (let i = lag; i < observations.length; i += 1) {
    if (observations[i] === observations[i - lag]) matches += 1;
  }
  return matches / (observations.length - lag);
}

/** Largest absolute deviation of any symbol frequency from perfect uniformity. */
function maxFrequencyDeviation(sample: EntropySample): number {
  const counts = symbolCounts(sample);
  const expected = 1 / sample.alphabetSize;
  return Math.max(...counts.map((c) => Math.abs(c / sample.observations.length - expected)));
}

describe("fixture integrity", () => {
  it("every fixture is a structurally valid sample", () => {
    for (const fixture of allFixtures()) {
      expect(() => assertValidSample(fixture.sample), fixture.id).not.toThrow();
    }
  });

  it("generation is deterministic across calls", () => {
    expect(fairLike().observations).toEqual(fairLike().observations);
    expect(stickyMarkov().observations).toEqual(stickyMarkov().observations);
    expect(biased().observations).toEqual(biased().observations);
  });

  it("a different seed produces a different sequence", () => {
    expect(fairLike(500, "seed-a").observations).not.toEqual(fairLike(500, "seed-b").observations);
  });
});

describe("FAIR_LIKE", () => {
  it("is close to uniform", () => {
    expect(maxFrequencyDeviation(fairLike())).toBeLessThan(0.02);
  });

  it("shows no serial dependence beyond chance", () => {
    // An independent source repeats the previous symbol about 1/6 of the time.
    expect(repeatRateAtLag(fairLike(), 1)).toBeGreaterThan(0.14);
    expect(repeatRateAtLag(fairLike(), 1)).toBeLessThan(0.19);
  });
});

describe("BIASED", () => {
  it("overrepresents symbol 0 at roughly 3/8 of draws", () => {
    const sample = biased();
    const frequency = (symbolCounts(sample)[0] as number) / sample.observations.length;
    expect(frequency).toBeGreaterThan(0.35);
    expect(frequency).toBeLessThan(0.4);
  });

  it("carries its defect in the marginals, not in the order", () => {
    // Order is independent, so lag-1 repetition matches the biased marginals
    // rather than exceeding them. sum(p_i^2) for weights [3,1,1,1,1,1] is 0.219.
    expect(repeatRateAtLag(biased(), 1)).toBeLessThan(0.25);
  });
});

describe("PERIODIC_BALANCED", () => {
  it("has an exactly uniform histogram", () => {
    // This is the property that makes the fixture adversarial: frequency
    // analysis has nothing at all to report.
    expect(maxFrequencyDeviation(periodicBalanced())).toBe(0);
    expect(symbolCounts(periodicBalanced())).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
  });

  it("is fully determined by the previous symbol", () => {
    expect(repeatRateAtLag(periodicBalanced(), 6)).toBe(1);
  });

  it("never repeats at lag 1", () => {
    expect(repeatRateAtLag(periodicBalanced(), 1)).toBe(0);
  });
});

describe("STICKY_MARKOV", () => {
  it("keeps near-uniform long-run frequencies", () => {
    // The defect must not be visible to frequency analysis, or the fixture
    // would not isolate sequential dependence.
    expect(maxFrequencyDeviation(stickyMarkov())).toBeLessThan(0.03);
  });

  it("repeats the previous symbol far more often than chance", () => {
    // Expected rate is stickiness + (1 - stickiness)/6 = 0.667 at s = 0.6.
    const rate = repeatRateAtLag(stickyMarkov(), 1);
    expect(rate).toBeGreaterThan(0.63);
    expect(rate).toBeLessThan(0.7);
  });

  it("is distinguishable from FAIR_LIKE only by order, not by histogram", () => {
    const fairDeviation = maxFrequencyDeviation(fairLike());
    const stickyDeviation = maxFrequencyDeviation(stickyMarkov());
    // Both look similarly uniform.
    expect(Math.abs(fairDeviation - stickyDeviation)).toBeLessThan(0.03);
    // But their sequential behaviour differs by a wide margin.
    expect(repeatRateAtLag(stickyMarkov(), 1)).toBeGreaterThan(repeatRateAtLag(fairLike(), 1) * 3);
  });
});

describe("LOW_SAMPLE", () => {
  it("is drawn from the same fair process, only shorter", () => {
    expect(lowSample().observations).toHaveLength(40);
    expect(lowSample().alphabetSize).toBe(6);
  });
});
