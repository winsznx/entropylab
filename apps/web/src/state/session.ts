import {
  analyze,
  explain,
  type EntropyAnalysis,
  type EntropySample,
  type Explanation,
} from "@entropylab/core";
import type { ProfileDraft } from "./store.js";

/** Where a dataset came from. Drives every provenance label in the product. */
export type Provenance = "synthetic" | "physical" | "imported" | "manual";

export interface SessionAnalysis {
  sample: EntropySample;
  analysis: EntropyAnalysis;
  explanation: Explanation;
  provenance: Provenance;
}

/**
 * Entropy targets reported for a profile.
 *
 * The chosen target is always shown alongside the two standard ones, so a
 * custom figure has something to be read against.
 */
export function targetsFor(targetBits: number): number[] {
  return [...new Set([128, 256, targetBits])].sort((a, b) => a - b);
}

/** Classifies a dataset from how it entered the product. */
export function provenanceOf(datasetSource: string): Provenance {
  if (datasetSource.startsWith("demo fixture")) return "synthetic";
  if (datasetSource.startsWith("physical")) return "physical";
  if (datasetSource.startsWith("file:") || datasetSource === "pasted text") return "imported";
  return "manual";
}

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  synthetic: "Synthetic test fixture",
  physical: "Physical calibration sample",
  imported: "Imported calibration data",
  manual: "Recorded calibration sample",
};

/**
 * The single analysis for the current session.
 *
 * Every screen and the exported report read this one function. An earlier
 * version analysed separately in Analysis.tsx and Export.tsx, and only the
 * first passed the profile's entropy target, so a report could carry
 * different target guidance from the screen the user had just read. Deriving
 * it in one place is what makes that class of divergence impossible rather
 * than merely fixed.
 */
export function analyzeSession(
  profile: ProfileDraft | null,
  observations: number[],
  datasetSource: string,
): SessionAnalysis | null {
  if (!profile || observations.length === 0) return null;

  const sample: EntropySample = { alphabetSize: profile.alphabetSize, observations };
  const analysis = analyze(sample, { targetBits: targetsFor(profile.targetBits) });

  return {
    sample,
    analysis,
    explanation: explain(analysis),
    provenance: provenanceOf(datasetSource),
  };
}
