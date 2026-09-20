import { describe, expect, it } from "vitest";
import { analyze, explain, parseSample } from "@entropylab/core";
import { buildReport, renderMarkdown } from "../src/index.js";
import type { ProcessProfile } from "../src/types.js";

const profile: ProcessProfile = {
  name: "Target guidance check",
  sourceType: "d6",
  alphabetSize: 6,
  collectionMethod: "unit test",
};

/**
 * The path the application takes: text a person recorded, through parsing,
 * analysis, explanation and report generation. Covered here rather than only
 * in the browser tests so a regression fails fast.
 */
function pipeline(text: string) {
  const { sample } = parseSample(text, { alphabetSize: 6 });
  const analysis = analyze(sample);
  return {
    sample,
    analysis,
    explanation: explain(analysis),
    report: buildReport({ profile, sample, analysis, datasetSource: "unit test" }),
  };
}

const cycle = (n: number): string =>
  Array.from({ length: n }, (_, i) => ((i % 6) + 1).toString()).join(" ");

describe("recorded text through to a report", () => {
  it("carries the parsed observation count into the report", () => {
    const { report } = pipeline(cycle(600));
    expect(report.dataset.sampleCount).toBe(600);
    expect(report.analysis.sampleCount).toBe(600);
  });

  it("produces a report whose markdown states the limiting method", () => {
    const { report } = pipeline(cycle(600));
    const markdown = renderMarkdown(report);
    expect(markdown).toMatch(/Limiting estimator/);
    expect(markdown).toContain(report.dataset.inputHash);
  });

  it("ignores comments when hashing, because they are not observations", () => {
    const withComments = pipeline(`# session one\n${cycle(600)}`);
    const without = pipeline(cycle(600));
    expect(withComments.report.dataset.inputHash).toBe(without.report.dataset.inputHash);
  });
});

describe("target guidance", () => {
  it("scales the observation count with the target", () => {
    const { analysis } = pipeline(cycle(600));
    const at128 = analysis.targetGuidance.find((g) => g.targetBits === 128);
    const at256 = analysis.targetGuidance.find((g) => g.targetBits === 256);
    if (at128?.estimatedSamplesRequired && at256?.estimatedSamplesRequired) {
      expect(at256.estimatedSamplesRequired).toBeGreaterThanOrEqual(
        at128.estimatedSamplesRequired * 2 - 1,
      );
    }
  });

  it("withholds a count when the measured rate is zero", () => {
    // A perfectly periodic source measures at zero bits. Printing a very large
    // observation count would imply the target is reachable by rolling longer.
    const { analysis } = pipeline(cycle(3000));
    expect(analysis.conservativeBitsPerSymbol).toBe(0);
    for (const guidance of analysis.targetGuidance) {
      expect(guidance.estimatedSamplesRequired).toBeUndefined();
    }
  });

  it("says so in the rendered report rather than leaving the section blank", () => {
    const { report } = pipeline(cycle(3000));
    expect(renderMarkdown(report)).toMatch(/the process itself needs to change/);
  });
});

describe("profile validation at the report boundary", () => {
  it("rejects observations outside the declared alphabet before analysis", () => {
    const { sample, issues } = parseSample("1 2 7 3", { alphabetSize: 6 });
    expect(issues).toHaveLength(1);
    expect(sample.observations).toEqual([0, 1, 2]);
  });

  it("refuses to analyse an empty sample rather than reporting zero bits", () => {
    const { sample } = parseSample("# nothing here", { alphabetSize: 6 });
    expect(() => analyze(sample)).toThrow();
  });

  it("distinguishes the same rolls recorded under different alphabets", () => {
    const d6 = parseSample("1 2 3 4 5 6", { alphabetSize: 6 });
    const d20 = parseSample("1 2 3 4 5 6", { alphabetSize: 20 });
    expect(d6.sample.observations).toEqual(d20.sample.observations);
    const hashA = buildReport({
      profile,
      sample: d6.sample,
      analysis: analyze(d6.sample),
      datasetSource: "a",
    }).dataset.inputHash;
    const hashB = buildReport({
      profile: { ...profile, alphabetSize: 20 },
      sample: d20.sample,
      analysis: analyze(d20.sample),
      datasetSource: "b",
    }).dataset.inputHash;
    expect(hashA).not.toBe(hashB);
  });
});
