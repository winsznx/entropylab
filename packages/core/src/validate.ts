import type { EntropySample } from "./types.js";

export class InvalidSampleError extends Error {
  override name = "InvalidSampleError";
}

/**
 * Rejects samples that no estimator could meaningfully consume.
 *
 * This guards the pipeline boundary. Estimators downstream may assume the
 * sample is structurally sound and only need to reason about statistical
 * applicability.
 */
export function assertValidSample(sample: EntropySample): void {
  const { alphabetSize, observations } = sample;

  if (!Number.isInteger(alphabetSize) || alphabetSize < 2) {
    throw new InvalidSampleError(`alphabetSize must be an integer >= 2, received ${alphabetSize}`);
  }
  if (observations.length === 0) {
    throw new InvalidSampleError("observations must not be empty");
  }
  for (let i = 0; i < observations.length; i += 1) {
    const value = observations[i] as number;
    if (!Number.isInteger(value) || value < 0 || value >= alphabetSize) {
      throw new InvalidSampleError(
        `observation at index ${i} is ${value}, outside the alphabet [0, ${alphabetSize})`,
      );
    }
  }
}

/** Counts occurrences of each symbol. Index `s` holds the count of symbol `s`. */
export function symbolCounts(sample: EntropySample): number[] {
  const counts = new Array<number>(sample.alphabetSize).fill(0);
  for (const observation of sample.observations) {
    counts[observation] = (counts[observation] as number) + 1;
  }
  return counts;
}
