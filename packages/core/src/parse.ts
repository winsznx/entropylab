import type { EntropySample } from "./types.js";

export interface ParseIssue {
  /** 1-based line number in the source text. */
  line: number;
  /** The token that could not be accepted. */
  token: string;
  reason: "unknown-symbol" | "out-of-alphabet";
}

export interface ParseResult {
  observations: number[];
  issues: ParseIssue[];
  /** Lines skipped as blank or comment. */
  skippedLines: number;
}

export interface ParseOptions {
  alphabetSize: number;
  /**
   * Accepted spelling of each symbol, indexed by symbol id. Defaults to the
   * one-based labels a person writes down for dice: "1" through "6".
   */
  labels?: string[];
}

/** The labels a person actually writes when recording dice or coin results. */
export function defaultLabels(alphabetSize: number): string[] {
  return Array.from({ length: alphabetSize }, (_, i) => String(i + 1));
}

/**
 * Parses recorded observations from free text.
 *
 * Accepts whatever a person is likely to produce when writing rolls down: one
 * per line, space separated, comma separated, or a single-column CSV, in any
 * mixture. Lines beginning with `#` are comments and blank lines are ignored,
 * so a recorded session can carry its own notes.
 *
 * Unrecognised tokens are collected rather than thrown. A single typo in six
 * hundred rolls should not cost the operator the whole session, and the caller
 * needs to see every problem at once to fix them in one pass.
 *
 * Symbols are returned as zero-based ids because that is what the estimators
 * consume. The one-based labels stay at the boundary.
 */
export function parseObservations(text: string, options: ParseOptions): ParseResult {
  const labels = options.labels ?? defaultLabels(options.alphabetSize);
  const lookup = new Map<string, number>();
  labels.forEach((label, index) => lookup.set(label.trim().toLowerCase(), index));

  const observations: number[] = [];
  const issues: ParseIssue[] = [];
  let skippedLines = 0;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const raw = (lines[i] as string).trim();
    if (raw === "" || raw.startsWith("#")) {
      skippedLines += 1;
      continue;
    }

    for (const token of raw.split(/[\s,;]+/)) {
      if (token === "") continue;
      const symbol = lookup.get(token.toLowerCase());
      if (symbol === undefined) {
        issues.push({ line: i + 1, token, reason: "unknown-symbol" });
        continue;
      }
      if (symbol >= options.alphabetSize) {
        issues.push({ line: i + 1, token, reason: "out-of-alphabet" });
        continue;
      }
      observations.push(symbol);
    }
  }

  return { observations, issues, skippedLines };
}

/** Builds a sample from parsed text, ignoring tokens that could not be read. */
export function parseSample(
  text: string,
  options: ParseOptions,
): ParseResult & {
  sample: EntropySample;
} {
  const result = parseObservations(text, options);
  return {
    ...result,
    sample: { alphabetSize: options.alphabetSize, observations: result.observations },
  };
}

/** Renders observations back to their labels, for export and display. */
export function formatObservations(sample: EntropySample, labels?: string[]): string {
  const names = labels ?? defaultLabels(sample.alphabetSize);
  return sample.observations.map((s) => names[s] ?? String(s)).join(" ");
}
