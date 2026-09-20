import type { EntropySample } from "@entropylab/core";
import { SeededRandom } from "./prng.js";

export { SeededRandom } from "./prng.js";

/** Stable identifiers for the adversarial campaign datasets. */
export type FixtureId =
  "FAIR_LIKE" | "BIASED" | "PERIODIC_BALANCED" | "STICKY_MARKOV" | "LOW_SAMPLE";

export interface Fixture {
  id: FixtureId;
  label: string;
  /** What defect, if any, is deliberately encoded into this dataset. */
  defect: string;
  /** The behaviour a correct profiler must exhibit on this dataset. */
  expectation: string;
  /** Seed used for generation, or null for datasets that are fully deterministic. */
  seed: string | null;
  sample: EntropySample;
}

const D6 = 6;

/**
 * Near-uniform control source.
 *
 * Purpose is negative control: it proves the profiler does not simply fail
 * every dataset handed to it. Symbols are drawn independently and uniformly,
 * so no estimator should find structure beyond sampling noise.
 */
export function fairLike(length = 6000, seed = "entropylab/fair-like/v1"): EntropySample {
  const rng = new SeededRandom(seed);
  const observations: number[] = [];
  for (let i = 0; i < length; i += 1) observations.push(rng.nextInt(D6));
  return { alphabetSize: D6, observations };
}

/**
 * Frequency-biased source, modelling a weighted or shaved die.
 *
 * Symbol 0 is drawn roughly three times as often as each other face. The defect
 * lives entirely in the marginal distribution, so a frequency-based estimator
 * should detect it and a purely sequential one should not.
 */
export function biased(length = 6000, seed = "entropylab/biased/v1"): EntropySample {
  const rng = new SeededRandom(seed);
  const weights = [3, 1, 1, 1, 1, 1];
  const observations: number[] = [];
  for (let i = 0; i < length; i += 1) observations.push(rng.pick(weights));
  return { alphabetSize: D6, observations };
}

/**
 * Perfectly balanced but fully deterministic source: 0,1,2,3,4,5,0,1,2,3,4,5,...
 *
 * This is the central fixture of the project. Its histogram is exactly uniform,
 * so frequency analysis reports the theoretical maximum rate, while the next
 * symbol is knowable with certainty from the previous one. Any profiler that
 * calls this source healthy has failed at its only job.
 */
export function periodicBalanced(length = 6000): EntropySample {
  const observations: number[] = [];
  for (let i = 0; i < length; i += 1) observations.push(i % D6);
  return { alphabetSize: D6, observations };
}

/**
 * Sticky correlated source, modelling a roll that often fails to tumble.
 *
 * With probability `stickiness` the previous symbol repeats; otherwise a
 * uniform symbol is drawn. Repetition is symmetric across faces, so long-run
 * frequencies stay close to uniform and only conditional analysis exposes the
 * dependence.
 */
export function stickyMarkov(
  length = 6000,
  stickiness = 0.6,
  seed = "entropylab/sticky-markov/v1",
): EntropySample {
  const rng = new SeededRandom(seed);
  const observations: number[] = [rng.nextInt(D6)];
  for (let i = 1; i < length; i += 1) {
    const previous = observations[i - 1] as number;
    observations.push(rng.nextFloat() < stickiness ? previous : rng.nextInt(D6));
  }
  return { alphabetSize: D6, observations };
}

/**
 * A fair process observed too few times to support any confident claim.
 *
 * The generating process is identical to {@link fairLike}. Only the sample size
 * differs, which isolates sample adequacy from source quality: the correct
 * response is an explicit insufficiency signal, not a low entropy score.
 */
export function lowSample(length = 40, seed = "entropylab/low-sample/v1"): EntropySample {
  const rng = new SeededRandom(seed);
  const observations: number[] = [];
  for (let i = 0; i < length; i += 1) observations.push(rng.nextInt(D6));
  return { alphabetSize: D6, observations };
}

/** The full campaign set, in the order used by reports and documentation. */
export function allFixtures(): Fixture[] {
  return [
    {
      id: "FAIR_LIKE",
      label: "Fair-like d6",
      defect: "None. Seeded pseudo-random control.",
      expectation: "Every estimator reports a rate close to the 2.585 bit ideal.",
      seed: "entropylab/fair-like/v1",
      sample: fairLike(),
    },
    {
      id: "BIASED",
      label: "Biased d6",
      defect: "Symbol 0 occurs roughly three times as often as each other face.",
      expectation: "Frequency analysis degrades. Sequential analysis stays near ideal.",
      seed: "entropylab/biased/v1",
      sample: biased(),
    },
    {
      id: "PERIODIC_BALANCED",
      label: "Periodic balanced d6",
      defect: "Exactly uniform histogram, fully deterministic order.",
      expectation:
        "Frequency analysis reports a near-ideal rate. Sequential analysis collapses to near zero.",
      seed: null,
      sample: periodicBalanced(),
    },
    {
      id: "STICKY_MARKOV",
      label: "Sticky d6",
      defect: "Previous symbol repeats with probability 0.6.",
      expectation: "Near-uniform histogram. Sequential analysis materially below ideal.",
      seed: "entropylab/sticky-markov/v1",
      sample: stickyMarkov(),
    },
    {
      id: "LOW_SAMPLE",
      label: "Low-sample d6",
      defect: "None in the process. Only 40 observations.",
      expectation: "Insufficiency is reported rather than a confident rate.",
      seed: "entropylab/low-sample/v1",
      sample: lowSample(),
    },
  ];
}
