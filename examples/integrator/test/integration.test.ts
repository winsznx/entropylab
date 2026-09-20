import { describe, expect, it } from "vitest";
import { fairLike, periodicBalanced } from "@entropylab/fixtures";
import { profileDiceProcess } from "../src/minimal.js";

/** Converts a fixture back to the one-based faces an integrator would hold. */
const faces = (sample: { observations: number[] }): number[] =>
  sample.observations.map((s) => s + 1);

describe("the documented integration", () => {
  it("returns a usable result for a healthy process", () => {
    const result = profileDiceProcess(faces(fairLike()), 6, 128);
    expect(result.bitsPerRoll).toBeGreaterThan(2);
    expect(result.limitedBy).toBeTruthy();
    expect(result.rollsNeeded).toBeGreaterThan(0);
    expect(result.declined).toHaveLength(0);
  });

  it("withholds a roll count when the process measures at zero", () => {
    // The case an integrator is most likely to get wrong: there is no roll
    // count that reaches a target at zero bits per roll.
    const result = profileDiceProcess(faces(periodicBalanced()), 6, 128);
    expect(result.bitsPerRoll).toBe(0);
    expect(result.rollsNeeded).toBeUndefined();
    expect(result.nextStep).toMatch(/Change how you roll/);
  });

  it("names the methods that could not run on a short sample", () => {
    const result = profileDiceProcess([3, 1, 6, 2, 5, 4, 1, 3, 6, 2], 6, 128);
    expect(result.declined).toContain("Markov");
    expect(result.declined).toContain("Lag predictor");
    expect(result.warnings.join(" ")).toMatch(/could not run/);
  });

  it("scales the roll count with the target", () => {
    const at128 = profileDiceProcess(faces(fairLike()), 6, 128).rollsNeeded as number;
    const at256 = profileDiceProcess(faces(fairLike()), 6, 256).rollsNeeded as number;
    expect(at256).toBeGreaterThanOrEqual(at128 * 2 - 1);
  });
});
