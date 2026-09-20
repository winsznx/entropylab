import { describe, expect, it } from "vitest";
import { analyze, explain } from "@entropylab/core";
import { allFixtures, type FixtureId } from "../src/index.js";

const explanations = new Map(allFixtures().map((f) => [f.id, explain(analyze(f.sample))] as const));

function kinds(id: FixtureId): string[] {
  return explanations.get(id)?.findings.map((f) => f.kind) ?? [];
}

describe("explanations for each fixture", () => {
  it("names periodicity when counts look fine but order does not", () => {
    expect(kinds("PERIODIC_BALANCED")).toContain("periodicity");
    const finding = explanations
      .get("PERIODIC_BALANCED")
      ?.findings.find((f) => f.kind === "periodicity");
    expect(finding?.headline).toMatch(/counts look balanced, but the order is predictable/);
  });

  it("tells the user to change the procedure for a periodic source", () => {
    const explanation = explanations.get("PERIODIC_BALANCED");
    expect(explanation?.recommendation).toBe("change-procedure");
    // Advising more data here would be actively wrong: the pattern is in the
    // procedure, so more rolls confirm it rather than remove it.
    expect(explanation?.recommendationReason).toMatch(/confirm it rather than remove it/);
  });

  it("names the repeating distance for the sticky source", () => {
    const finding = explanations
      .get("STICKY_MARKOV")
      ?.findings.find((f) => f.kind === "periodicity" || f.kind === "sequential-structure");
    expect(finding?.detail).toMatch(/not tumbling/);
  });

  it("points at the die for a frequency-biased source", () => {
    expect(kinds("BIASED")).toContain("frequency-bias");
    const explanation = explanations.get("BIASED");
    expect(explanation?.recommendation).toBe("investigate-source");
    expect(explanation?.recommendationText).toMatch(/Check the die itself/);
  });

  it("quotes the observed share for a biased source", () => {
    const finding = explanations.get("BIASED")?.findings.find((f) => f.kind === "frequency-bias");
    // 3/8 of rolls against 16.7% for a balanced d6.
    expect(finding?.detail).toMatch(/3[5-9]\.\d% of rolls/);
    expect(finding?.detail).toMatch(/16\.7%/);
  });

  it("asks for more data when methods could not run", () => {
    expect(kinds("LOW_SAMPLE")).toContain("insufficient-data");
    const explanation = explanations.get("LOW_SAMPLE");
    expect(explanation?.recommendation).toBe("collect-more-data");
    // The distinction that matters: not enough evidence, rather than evidence
    // of a bad source.
    expect(explanation?.recommendationReason).toMatch(/not yet enough evidence/);
  });

  it("does not claim a fair source is proven random", () => {
    const explanation = explanations.get("FAIR_LIKE");
    expect(explanation?.recommendation).toBe("proceed-with-limitations");
    expect(explanation?.recommendationReason).toMatch(/not proof of unpredictability/);
    const finding = explanation?.findings.find((f) => f.kind === "no-structure-found");
    expect(finding?.detail).toMatch(/not the same as the source being unpredictable/);
  });

  it("never emits a pass or fail verdict", () => {
    for (const [id, explanation] of explanations) {
      const text = JSON.stringify(explanation).toLowerCase();
      expect(text, id).not.toMatch(/certified|guaranteed|proven secure|passed|safe to use/);
    }
  });

  it("always produces exactly one recommendation", () => {
    for (const [id, explanation] of explanations) {
      expect(explanation.recommendation, id).toBeTruthy();
      expect(explanation.recommendationText.length, id).toBeGreaterThan(10);
    }
  });

  it("backs every finding with named estimator evidence", () => {
    for (const [id, explanation] of explanations) {
      for (const finding of explanation.findings) {
        expect(finding.evidence.length, `${id}/${finding.kind}`).toBeGreaterThan(0);
      }
    }
  });
});
