import { describe, expect, it } from "vitest";
import { MarkovEstimator } from "../src/estimators/markov.js";

const estimator = new MarkovEstimator();

/** Repeats a cycle until it reaches `length` symbols. */
function cycle(pattern: number[], length: number): number[] {
  return Array.from({ length }, (_, i) => pattern[i % pattern.length] as number);
}

describe("markov, deterministic structure", () => {
  it("collapses to near zero on a fully determined sequence", () => {
    // 0,1,2,3,4,5 repeating. Every transition has observed probability 1, so
    // the most probable 128-chain has probability equal to the initial state
    // bound alone, and the per-symbol figure is that bound spread over 128
    // steps. The result should be close to zero and nowhere near the 2.585
    // that frequency analysis reports for the same data.
    const result = estimator.run({
      alphabetSize: 6,
      observations: cycle([0, 1, 2, 3, 4, 5], 6000),
    });
    expect(result.applicable).toBe(true);
    expect(result.bitsPerSymbol as number).toBeLessThan(0.05);
  });

  it("collapses on a two-state deterministic alternation", () => {
    const result = estimator.run({ alphabetSize: 2, observations: cycle([0, 1], 4000) });
    expect(result.bitsPerSymbol as number).toBeLessThan(0.05);
  });

  it("reports zero-width transitions as certain", () => {
    const result = estimator.run({
      alphabetSize: 6,
      observations: cycle([0, 1, 2, 3, 4, 5], 6000),
    });
    const upper = result.diagnostics.transitionUpper as number[][];
    // Transition 0 -> 1 is always taken, so its upper bound is exactly 1.
    expect((upper[0] as number[])[1]).toBe(1);
    expect((upper[0] as number[])[2]).toBe(0);
  });
});

describe("markov, statistical behaviour", () => {
  it("never exceeds the alphabet ceiling", () => {
    const observations = Array.from({ length: 6000 }, (_, i) => (i * 2654435761) % 6);
    const result = estimator.run({ alphabetSize: 6, observations });
    expect(result.bitsPerSymbol as number).toBeLessThanOrEqual(Math.log2(6));
  });

  it("scores a sticky source well below a memoryless one", () => {
    // Both sequences have near-uniform marginals; only the ordering differs.
    let state = 0;
    let seed = 12345;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const sticky: number[] = [0];
    const memoryless: number[] = [];
    for (let i = 0; i < 6000; i += 1) {
      state = next() < 0.6 ? (sticky[i] as number) : Math.floor(next() * 6);
      sticky.push(state);
      memoryless.push(Math.floor(next() * 6));
    }
    const stickyBits = estimator.run({ alphabetSize: 6, observations: sticky })
      .bitsPerSymbol as number;
    const memorylessBits = estimator.run({ alphabetSize: 6, observations: memoryless })
      .bitsPerSymbol as number;

    expect(stickyBits).toBeLessThan(memorylessBits - 1);
  });

  it("flags rows estimated from too few transitions", () => {
    // Symbol 5 appears rarely, so its outgoing row is thin.
    const observations = Array.from({ length: 1000 }, (_, i) => (i % 200 === 0 ? 5 : i % 5));
    const result = estimator.run({ alphabetSize: 6, observations });
    expect(result.quality).toBe("unstable");
    expect(result.warnings.join(" ")).toMatch(/transition rows/);
  });

  it("labels the generalisation on a non-binary alphabet", () => {
    const result = estimator.run({
      alphabetSize: 6,
      observations: cycle([0, 1, 2, 3, 4, 5], 1000),
    });
    expect(result.diagnostics.mode).toBe("generalised-alphabet");
    expect(result.warnings.join(" ")).toMatch(/documented generalisation/);
  });
});

describe("markov, applicability", () => {
  it("declines below the chain length rather than guessing", () => {
    const result = estimator.run({ alphabetSize: 6, observations: cycle([0, 1, 2], 127) });
    expect(result.applicable).toBe(false);
    expect(result.inapplicabilityReason).toBe("insufficient-samples");
    expect(result.bitsPerSymbol).toBeUndefined();
  });

  it("runs at exactly the chain length", () => {
    const result = estimator.run({ alphabetSize: 6, observations: cycle([0, 1, 2, 3, 4, 5], 128) });
    expect(result.applicable).toBe(true);
  });
});
