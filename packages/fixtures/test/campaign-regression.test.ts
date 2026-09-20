import { describe, expect, it } from "vitest";
import { analyze } from "@entropylab/core";
import { allFixtures, type FixtureId } from "../src/index.js";

/**
 * Pins the published campaign numbers.
 *
 * These values appear in docs/proof-campaign and in the README. If an
 * estimator changes, this fails and the documentation has to be regenerated
 * with `pnpm campaign` in the same commit, which keeps the published claims
 * from drifting away from the code.
 */
const EXPECTED: Record<
  FixtureId,
  { mcv: number; collision: number; markov: number | null; lag: number | null; limiting: string }
> = {
  FAIR_LIKE: { mcv: 2.3983, collision: 2.585, markov: 2.2154, lag: 2.462, limiting: "markov" },
  BIASED: { mcv: 1.4055, collision: 1.513, markov: 1.3747, lag: 2.1733, limiting: "markov" },
  PERIODIC_BALANCED: {
    mcv: 2.4815,
    collision: 2.585,
    markov: 0.0194,
    lag: 0,
    limiting: "lag-predictor",
  },
  STICKY_MARKOV: { mcv: 2.4232, collision: 2.585, markov: 0.4765, lag: 0.5533, limiting: "markov" },
  LOW_SAMPLE: {
    mcv: 1.2223,
    collision: 1.5538,
    markov: null,
    lag: null,
    limiting: "most-common-value",
  },
};

const analyses = new Map(allFixtures().map((f) => [f.id, analyze(f.sample)]));

function bits(fixtureId: FixtureId, estimatorId: string): number | null {
  const result = analyses.get(fixtureId)?.estimators.find((e) => e.id === estimatorId);
  if (!result?.applicable || result.bitsPerSymbol === undefined) return null;
  return result.bitsPerSymbol;
}

describe("campaign regression", () => {
  for (const [id, expected] of Object.entries(EXPECTED)) {
    const fixtureId = id as FixtureId;
    it(`${fixtureId} matches the published figures`, () => {
      expect(bits(fixtureId, "most-common-value")).toBeCloseTo(expected.mcv, 4);
      expect(bits(fixtureId, "collision")).toBeCloseTo(expected.collision, 4);

      if (expected.markov === null) expect(bits(fixtureId, "markov")).toBeNull();
      else expect(bits(fixtureId, "markov")).toBeCloseTo(expected.markov, 4);

      if (expected.lag === null) expect(bits(fixtureId, "lag-predictor")).toBeNull();
      else expect(bits(fixtureId, "lag-predictor")).toBeCloseTo(expected.lag, 4);

      expect(analyses.get(fixtureId)?.limitingEstimator).toBe(expected.limiting);
    });
  }
});

describe("campaign assertions", () => {
  it("frequency analysis rates the deterministic source highest of all fixtures", () => {
    // The headline claim, checked against every fixture rather than one pair.
    const scores = [...analyses.entries()].map(([id, analysis]) => ({
      id,
      bits: analysis.estimators.find((e) => e.id === "most-common-value")?.bitsPerSymbol ?? 0,
    }));
    const best = scores.reduce((a, b) => (b.bits > a.bits ? b : a));
    expect(best.id).toBe("PERIODIC_BALANCED");
  });

  it("sequential analysis rates the same source lowest of all fixtures", () => {
    const scores = [...analyses.entries()].map(([id, analysis]) => ({
      id,
      bits: analysis.conservativeBitsPerSymbol ?? Infinity,
    }));
    const worst = scores.reduce((a, b) => (b.bits < a.bits ? b : a));
    expect(worst.id).toBe("PERIODIC_BALANCED");
  });

  it("the deterministic source loses more than two bits between the two views", () => {
    const analysis = analyses.get("PERIODIC_BALANCED");
    const frequency = analysis?.estimators.find((e) => e.id === "most-common-value")
      ?.bitsPerSymbol as number;
    const conservative = analysis?.conservativeBitsPerSymbol as number;
    expect(frequency - conservative).toBeGreaterThan(2.4);
  });

  it("the sticky source is caught without its histogram giving it away", () => {
    const sticky = analyses.get("STICKY_MARKOV");
    const fair = analyses.get("FAIR_LIKE");
    const stickyMcv = sticky?.estimators.find((e) => e.id === "most-common-value")
      ?.bitsPerSymbol as number;
    const fairMcv = fair?.estimators.find((e) => e.id === "most-common-value")
      ?.bitsPerSymbol as number;

    // Frequency analysis cannot separate them: sticky even scores higher.
    expect(Math.abs(stickyMcv - fairMcv)).toBeLessThan(0.1);
    // The conservative figures are far apart.
    expect(
      (fair?.conservativeBitsPerSymbol as number) - (sticky?.conservativeBitsPerSymbol as number),
    ).toBeGreaterThan(1.5);
  });

  it("the low-sample fixture never reports a confident result", () => {
    const analysis = analyses.get("LOW_SAMPLE");
    const declined = analysis?.estimators.filter((e) => !e.applicable) ?? [];
    expect(declined.length).toBe(2);

    const limiting = analysis?.estimators.find((e) => e.id === analysis.limitingEstimator);
    expect(limiting?.quality).toBe("unstable");
    expect(analysis?.warnings.join(" ")).toMatch(/weakest evidence/);
  });

  it("no fixture reports more bits than its alphabet can carry", () => {
    for (const [id, analysis] of analyses) {
      for (const result of analysis.estimators) {
        if (!result.applicable || result.bitsPerSymbol === undefined) continue;
        expect(result.bitsPerSymbol, `${id}/${result.id}`).toBeLessThanOrEqual(
          analysis.idealBitsPerSymbol + 1e-9,
        );
      }
    }
  });
});
