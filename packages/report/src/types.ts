import type { EntropyAnalysis, EntropySample } from "@entropylab/core";

/** Describes the physical process a sample came from. */
export interface ProcessProfile {
  name: string;
  sourceType: "d6" | "coin" | "custom";
  alphabetSize: number;
  /** Human-readable names for each symbol, indexed by symbol id. */
  labels?: string[];
  /** How the observations were produced, in the operator's own words. */
  collectionMethod?: string;
  notes?: string;
}

export interface DatasetMetadata {
  /** Where the observations came from, e.g. a fixture id or "manual entry". */
  source: string;
  /**
   * How the dataset was produced, in the product's own vocabulary: a
   * synthetic test fixture, a physical calibration sample, and so on.
   *
   * Carried in the report because a reader who cannot tell generated data
   * from measured data cannot judge anything else in the document.
   */
  provenance: string;
  sampleCount: number;
  alphabetSize: number;
  /** SHA-256 over the canonical serialisation of the observations. */
  inputHash: string;
}

export interface EntropyReport {
  reportFormatVersion: string;
  algorithmVersion: string;
  /** Caller-supplied. Omitted entirely rather than filled from the clock. */
  generatedAt?: string;
  process: ProcessProfile;
  dataset: DatasetMetadata;
  analysis: EntropyAnalysis;
  /** The single recommended next step, in the interface's own words. */
  recommendation?: { text: string; reason: string };
  assumptions: string[];
  limitations: string[];
  /** How much authority each estimator's methodology carries. */
  methodologyBoundaries: string[];
}

export interface BuildReportOptions {
  profile: ProcessProfile;
  sample: EntropySample;
  analysis: EntropyAnalysis;
  datasetSource: string;
  /** Defaults to "Unspecified" so provenance is never silently absent. */
  provenance?: string;
  recommendation?: { text: string; reason: string };
  /** ISO timestamp. Left out when the report must be byte-reproducible. */
  generatedAt?: string;
}
