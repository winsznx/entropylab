import type { EntropySample } from "@entropylab/core";
import { sha256Hex } from "./sha256.js";
import type { BuildReportOptions, EntropyReport } from "./types.js";

export const REPORT_FORMAT_VERSION = "1.0.0";

/**
 * Statements the numbers depend on. They travel with the report because a
 * reader who does not know them cannot tell what the figure means.
 */
const ASSUMPTIONS = [
  "The observations were produced by the same physical process the report describes.",
  "Observations are recorded in the order they occurred. Every sequential estimator depends on this.",
  "The alphabet is fixed and every outcome was recorded, including repeats and results the operator disliked.",
  "The calibration sample is representative of how the process will behave during the ceremony it is meant to inform.",
];

/**
 * Limitations that hold no matter how good the numbers look. Written as flat
 * statements rather than hedges, because a reader skimming a report needs to
 * come away knowing what it does not establish.
 */
const LIMITATIONS = [
  "Statistical testing cannot establish that a source is random. It can only find structure, and finding none is not proof that none exists.",
  "These four estimators do not exhaust the ways a physical process can be predictable. A source can pass all of them and still be predictable by a method not implemented here.",
  "The result describes the observed sample. It does not guarantee how the process will behave later, and human-operated processes drift.",
  "Small samples produce unstable estimates. Where an estimator reports instability, the figure can move substantially with more data.",
  "A figure at the alphabet ceiling means no structure was found, not that the source was shown to be strong.",
  "This is not a NIST SP 800-90B validation and confers no certification. Estimators derived from that document are noted individually, including where this implementation diverges from it.",
  "Entropy quality is one part of seed security. It does not address the wallet, the derivation, the operating system, or physical observation of the ceremony.",
];

/**
 * Canonical serialisation of a dataset, used as the hash input.
 *
 * The alphabet size is included so that identical symbol sequences drawn from
 * different alphabets hash differently: the same digits read as a d6 and as a
 * d20 are not the same dataset and must not share an identifier.
 */
export function canonicalDatasetString(sample: EntropySample): string {
  return `entropylab/v1\nalphabet:${sample.alphabetSize}\n${sample.observations.join(",")}`;
}

export function hashSample(sample: EntropySample): string {
  return sha256Hex(canonicalDatasetString(sample));
}

/**
 * Assembles the canonical machine-readable result.
 *
 * The timestamp is supplied by the caller rather than read from the clock. A
 * report that stamps itself cannot be byte-compared against a regeneration
 * from the same inputs, which is the property the proof campaign depends on.
 */
export function buildReport(options: BuildReportOptions): EntropyReport {
  const { profile, sample, analysis, datasetSource, generatedAt } = options;

  return {
    reportFormatVersion: REPORT_FORMAT_VERSION,
    algorithmVersion: analysis.version,
    ...(generatedAt ? { generatedAt } : {}),
    process: profile,
    dataset: {
      source: datasetSource,
      sampleCount: sample.observations.length,
      alphabetSize: sample.alphabetSize,
      inputHash: hashSample(sample),
    },
    analysis,
    assumptions: [...ASSUMPTIONS],
    limitations: [...LIMITATIONS],
  };
}
