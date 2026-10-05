import { describe, expect, it } from "vitest";
import { analyze } from "@entropylab/core";
import { periodicBalanced, fairLike } from "@entropylab/fixtures";
import { buildReport, hashSample, canonicalDatasetString } from "../src/build.js";
import { renderMarkdown } from "../src/markdown.js";
import type { ProcessProfile } from "../src/types.js";

const profile: ProcessProfile = {
  name: "Test d6",
  sourceType: "d6",
  alphabetSize: 6,
  collectionMethod: "synthetic fixture",
};

function reportFor(sample: Parameters<typeof analyze>[0], source: string) {
  return buildReport({ profile, sample, analysis: analyze(sample), datasetSource: source });
}

describe("dataset hashing", () => {
  it("is stable for identical input", () => {
    expect(hashSample(fairLike())).toBe(hashSample(fairLike()));
  });

  it("distinguishes datasets that differ by a single observation", () => {
    const a = { alphabetSize: 6, observations: [0, 1, 2, 3] };
    const b = { alphabetSize: 6, observations: [0, 1, 2, 4] };
    expect(hashSample(a)).not.toBe(hashSample(b));
  });

  it("distinguishes identical symbols read as different alphabets", () => {
    // The same digits from a d6 and from a d20 are not the same dataset and
    // must not share an identifier.
    const observations = [0, 1, 2, 3, 4, 5];
    expect(hashSample({ alphabetSize: 6, observations })).not.toBe(
      hashSample({ alphabetSize: 20, observations }),
    );
  });

  it("distinguishes a reordering", () => {
    expect(hashSample({ alphabetSize: 6, observations: [0, 1, 2] })).not.toBe(
      hashSample({ alphabetSize: 6, observations: [2, 1, 0] }),
    );
  });

  it("includes a format tag so the serialisation can change safely", () => {
    expect(canonicalDatasetString({ alphabetSize: 6, observations: [1] })).toMatch(
      /^entropylab\/v1\n/,
    );
  });
});

describe("report construction", () => {
  it("carries the metadata needed to reproduce the analysis", () => {
    const report = reportFor(fairLike(), "FAIR_LIKE");
    expect(report.algorithmVersion).toBe(report.analysis.version);
    expect(report.dataset.sampleCount).toBe(6000);
    expect(report.dataset.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(report.reportFormatVersion).toBe("1.0.0");
  });

  it("omits the timestamp unless one is supplied", () => {
    // A report that stamps itself cannot be byte-compared against a
    // regeneration, which the proof campaign depends on.
    expect(reportFor(fairLike(), "FAIR_LIKE").generatedAt).toBeUndefined();
  });

  it("is byte-identical across regenerations of the same input", () => {
    expect(JSON.stringify(reportFor(fairLike(), "FAIR_LIKE"))).toBe(
      JSON.stringify(reportFor(fairLike(), "FAIR_LIKE")),
    );
  });

  it("always states assumptions and limitations", () => {
    const report = reportFor(fairLike(), "FAIR_LIKE");
    expect(report.assumptions.length).toBeGreaterThan(0);
    expect(report.limitations.join(" ")).toMatch(/cannot establish that a source is random/);
    expect(report.limitations.join(" ")).toMatch(/not a NIST SP 800-90B validation/);
  });
});

describe("markdown rendering", () => {
  it("leads with the conservative figure and the limiting estimator", () => {
    const markdown = renderMarkdown(reportFor(periodicBalanced(), "PERIODIC_BALANCED"));
    expect(markdown).toMatch(/bits per symbol\*\* \(conservative estimate/);
    expect(markdown).toMatch(/Limiting estimator/);
  });

  it("reports every estimator, including those that declined", () => {
    const markdown = renderMarkdown(
      reportFor({ alphabetSize: 6, observations: [0, 1, 2, 3, 4, 5, 0, 1] }, "tiny"),
    );
    expect(markdown).toMatch(/Markov \| not applicable \| declined \(insufficient-samples\)/);
  });

  it("states that a dead process cannot be fixed by collecting more data", () => {
    const markdown = renderMarkdown(reportFor(periodicBalanced(), "PERIODIC_BALANCED"));
    expect(markdown).toMatch(/the process itself needs to change/);
  });

  it("shows observation counts when a target is reachable", () => {
    const markdown = renderMarkdown(reportFor(fairLike(), "FAIR_LIKE"));
    expect(markdown).toMatch(/\| 128 bits \| \d+ \|/);
    expect(markdown).toMatch(/\| 256 bits \| \d+ \|/);
  });

  it("carries the input hash and the algorithm version", () => {
    const report = reportFor(fairLike(), "FAIR_LIKE");
    const markdown = renderMarkdown(report);
    expect(markdown).toContain(report.dataset.inputHash);
    expect(markdown).toContain(report.algorithmVersion);
  });

  it("never claims certification", () => {
    const markdown = renderMarkdown(reportFor(fairLike(), "FAIR_LIKE"));
    expect(markdown).not.toMatch(/certified|guaranteed|proven secure/i);
    expect(markdown).toMatch(/does not generate, inspect, or handle seed material/);
  });
});

describe("report completeness", () => {
  const complete = buildReport({
    profile,
    sample: fairLike(),
    analysis: analyze(fairLike()),
    datasetSource: "FAIR_LIKE",
    provenance: "Synthetic test fixture",
    recommendation: { text: "Do the thing.", reason: "Because of the reason." },
  });

  it("names its provenance rather than leaving it to be inferred", () => {
    expect(complete.dataset.provenance).toBe("Synthetic test fixture");
    expect(renderMarkdown(complete)).toMatch(/\| Provenance \| \*\*Synthetic test fixture\*\* \|/);
  });

  it("carries the recommended next step beside the figure", () => {
    const markdown = renderMarkdown(complete);
    expect(markdown).toMatch(/### Recommended next step/);
    expect(markdown).toMatch(/\*\*Do the thing\.\*\*/);
    // Before the dataset table, so a reader meets the action with the result.
    expect(markdown.indexOf("Recommended next step")).toBeLessThan(markdown.indexOf("## Dataset"));
  });

  it("states how much authority each method carries", () => {
    const markdown = renderMarkdown(complete);
    expect(markdown).toMatch(/## Methodology boundaries/);
    expect(markdown).toMatch(/used directly/);
    expect(markdown).toMatch(/adapted/);
    expect(markdown).toMatch(/a generalisation, not the published method/);
    expect(markdown).toMatch(/Sample-size gates are this project's own judgement/);
  });

  it("holds every field a reader needs to judge it", () => {
    const markdown = renderMarkdown(complete);
    for (const section of [
      "## Result",
      "## Dataset",
      "## Estimators",
      "## Target guidance",
      "## Methodology boundaries",
      "## Assumptions",
      "## Limitations",
    ]) {
      expect(markdown, section).toContain(section);
    }
    expect(markdown).toContain(complete.dataset.inputHash);
    expect(markdown).toContain(complete.algorithmVersion);
  });

  it("never claims certification, in any section", () => {
    const markdown = renderMarkdown(complete).toLowerCase();
    expect(markdown).not.toMatch(/\bcertified\b|\bguaranteed\b|\bproven secure\b|nist compliant/);
    expect(markdown).toMatch(/not a nist sp 800-90b validation/);
  });
});
