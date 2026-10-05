/**
 * How much authority each method carries.
 *
 * These categories are the ones in docs/METHODOLOGY.md, under Methodology
 * boundaries, and the words must stay identical in both places. The interface
 * must never let a generalisation borrow the credibility of a published
 * algorithm, which is exactly what an undifferentiated table of four numbers
 * does.
 */
export type Authority = "direct" | "adapted" | "generalised";

export interface MethodNote {
  authority: Authority;
  /** What the method tests, in one line. */
  tests: string;
  /** The qualification a reader needs before quoting its figure. */
  caveat: string;
}

export const AUTHORITY_LABEL: Record<Authority, string> = {
  direct: "SP 800-90B, used directly",
  adapted: "SP 800-90B, adapted",
  generalised: "Generalised, not the published method",
};

export const METHOD_NOTES: Record<string, MethodNote> = {
  "most-common-value": {
    authority: "direct",
    tests: "How often the commonest outcome appears.",
    caveat:
      "Defined over any alphabet, so it runs on dice unmodified. Blind to order: reordering the sample cannot change its figure.",
  },
  collision: {
    authority: "adapted",
    tests: "How quickly outcomes start repeating.",
    caveat:
      "Binary-only in the specification, so a die is encoded to three bits first. Six faces do not fill a three-bit codeword, so the figure measures the source and that encoding together.",
  },
  markov: {
    authority: "generalised",
    tests: "Whether the next outcome depends on the current one.",
    caveat:
      "The published method is binary-only. This is a k-symbol generalisation following the 2016 second draft, and it does not reduce to the published method even at two symbols. Excluded from the reference comparison.",
  },
  "lag-predictor": {
    authority: "direct",
    tests: "Whether any outcome repeats at a fixed distance back.",
    caveat:
      "No alphabet restriction, so it runs on dice unmodified. Cannot see a period longer than 128.",
  },
};
