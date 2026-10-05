import { describe, expect, it } from "vitest";
import { buildReport } from "@entropylab/report";
import { fairLike, periodicBalanced } from "@entropylab/fixtures";
import {
  analyzeSession,
  provenanceOf,
  targetsFor,
  PROVENANCE_LABEL,
} from "../src/state/session.js";
import { makeProfile } from "../src/state/store.js";

const profile = (patch = {}) =>
  makeProfile({ name: "Session test", collectionMethod: "unit test", ...patch });

describe("one analysis for the session", () => {
  /**
   * The regression this file exists for.
   *
   * Analysis.tsx and Export.tsx used to call analyze() separately, and only
   * the first passed the profile's entropy target. A user with a custom
   * target read guidance on screen that the exported report did not contain.
   * Both now derive from analyzeSession, and this asserts that a custom
   * target survives all the way into the report.
   */
  it("carries a custom entropy target into the report", () => {
    const custom = profile({ targetBits: 192 });
    const session = analyzeSession(custom, fairLike().observations, "manual entry");
    if (!session) throw new Error("expected a session");

    const onScreen = session.analysis.targetGuidance.map((g) => g.targetBits);
    expect(onScreen).toEqual([128, 192, 256]);

    const report = buildReport({
      profile: {
        name: custom.name,
        sourceType: custom.sourceType,
        alphabetSize: custom.alphabetSize,
        collectionMethod: custom.collectionMethod,
      },
      sample: session.sample,
      analysis: session.analysis,
      datasetSource: "manual entry",
      provenance: PROVENANCE_LABEL[session.provenance],
    });

    expect(report.analysis.targetGuidance.map((g) => g.targetBits)).toEqual(onScreen);
  });

  it("gives the report the identical analysis object the screen rendered", () => {
    const session = analyzeSession(profile(), fairLike().observations, "manual entry");
    if (!session) throw new Error("expected a session");

    const report = buildReport({
      profile: { name: "x", sourceType: "d6", alphabetSize: 6 },
      sample: session.sample,
      analysis: session.analysis,
      datasetSource: "manual entry",
    });

    // Same reference, so no field can drift between the two.
    expect(report.analysis).toBe(session.analysis);
    expect(report.analysis.conservativeBitsPerSymbol).toBe(
      session.analysis.conservativeBitsPerSymbol,
    );
    expect(report.analysis.limitingEstimator).toBe(session.analysis.limitingEstimator);
  });

  it("always shows the standard targets beside a custom one", () => {
    expect(targetsFor(192)).toEqual([128, 192, 256]);
    expect(targetsFor(128)).toEqual([128, 256]);
    expect(targetsFor(512)).toEqual([128, 256, 512]);
  });

  it("returns nothing rather than an empty analysis when there is no data", () => {
    expect(analyzeSession(profile(), [], "manual entry")).toBeNull();
    expect(analyzeSession(null, [1, 2, 3], "manual entry")).toBeNull();
  });

  it("explains the same result it analysed", () => {
    const session = analyzeSession(profile(), periodicBalanced().observations, "manual entry");
    expect(session?.analysis.conservativeBitsPerSymbol).toBe(0);
    expect(session?.explanation.recommendation).toBe("change-procedure");
  });
});

describe("provenance", () => {
  it("classifies every way a dataset can enter the product", () => {
    expect(provenanceOf("demo fixture PERIODIC_BALANCED")).toBe("synthetic");
    expect(provenanceOf("physical-d6-session-1.txt")).toBe("physical");
    expect(provenanceOf("file: session-1.txt")).toBe("imported");
    expect(provenanceOf("pasted text")).toBe("imported");
    expect(provenanceOf("manual entry")).toBe("manual");
  });

  it("never labels generated data as measured", () => {
    // The distinction the product's credibility rests on.
    expect(PROVENANCE_LABEL.synthetic).toBe("Synthetic test fixture");
    expect(PROVENANCE_LABEL.physical).toBe("Physical calibration sample");
    expect(PROVENANCE_LABEL.synthetic).not.toMatch(/physical|calibration sample|measured/i);
  });

  it("puts provenance in the report, defaulting to unspecified rather than absent", () => {
    const session = analyzeSession(profile(), fairLike().observations, "demo fixture X");
    if (!session) throw new Error("expected a session");

    const labelled = buildReport({
      profile: { name: "x", sourceType: "d6", alphabetSize: 6 },
      sample: session.sample,
      analysis: session.analysis,
      datasetSource: "demo fixture X",
      provenance: PROVENANCE_LABEL[session.provenance],
    });
    expect(labelled.dataset.provenance).toBe("Synthetic test fixture");

    const unlabelled = buildReport({
      profile: { name: "x", sourceType: "d6", alphabetSize: 6 },
      sample: session.sample,
      analysis: session.analysis,
      datasetSource: "somewhere",
    });
    expect(unlabelled.dataset.provenance).toBe("Unspecified");
  });
});
