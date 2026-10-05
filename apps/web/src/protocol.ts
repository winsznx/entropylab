/**
 * The calibration protocol, as the interface states it.
 *
 * docs/CAMPAIGN-F-PROTOCOL.md is authoritative; this is the operational
 * summary a person needs while standing over a die, not a second protocol.
 * Nothing here may contradict that document.
 */
export interface Protocol {
  /** Observations one session should contain, or null when the source has no fixed figure. */
  perSession: number | null;
  sessions: number | null;
  /** Why the per-session figure is what it is. */
  rationale: string;
  /** Conditions held constant for the calibration to mean anything. */
  constants: string[];
  /** The rule for a roll that does not count, declared before collecting. */
  invalidRule: string;
  /** Rules that apply to recording, whatever the source. */
  recording: string[];
}

const UNIVERSAL_RECORDING = [
  "Record outcomes in the order they happen. Every sequential method depends on it.",
  "Record every valid outcome, including runs of the same face. Dropping a result because it looks wrong is itself a bias, and it leaves no trace in the data.",
  "Never reuse calibration observations as seed material.",
];

export const D6_PROTOCOL: Protocol = {
  perSession: 256,
  sessions: 3,
  rationale:
    "256 is the smallest session every method can read. The lag predictor scores 128 lags and declines below 256, because most of those lags have not been observed once.",
  constants: [
    "the same die",
    "the same throwing surface",
    "the same release method",
    "the same operator",
  ],
  invalidRule:
    "A roll counts unless the die fails to come to rest flat inside the throwing area. Re-roll a cocked die or one that leaves the area, and record neither outcome.",
  recording: UNIVERSAL_RECORDING,
};

export const COIN_PROTOCOL: Protocol = {
  perSession: 256,
  sessions: 3,
  rationale:
    "256 is the smallest session every method can read. Below it the lag predictor declines, because most of its 128 lags have not been observed.",
  constants: [
    "the same coin",
    "the same catching or landing surface",
    "the same flick and height",
    "the same operator",
  ],
  invalidRule:
    "A flip counts unless the coin lands outside the area or does not turn over. Re-flip and record neither outcome.",
  recording: UNIVERSAL_RECORDING,
};

/**
 * A custom source has no session figure, because nobody has decided what one
 * is. The gates still apply, so the interface reports what each method needs
 * rather than inventing a target.
 */
export const CUSTOM_PROTOCOL: Protocol = {
  perSession: null,
  sessions: null,
  rationale:
    "No session size is prescribed for a custom source. The methods still have their own minimums: 128 observations before the Markov estimate runs, and 256 before the lag predictor does.",
  constants: ["the same physical source", "the same collection method", "the same operator"],
  invalidRule:
    "Decide before you start what makes an observation invalid, write it in the notes, and apply it without exception.",
  recording: UNIVERSAL_RECORDING,
};

export function protocolFor(sourceType: "d6" | "coin" | "custom"): Protocol {
  if (sourceType === "d6") return D6_PROTOCOL;
  if (sourceType === "coin") return COIN_PROTOCOL;
  return CUSTOM_PROTOCOL;
}

/** Observations below which no method beyond the frequency estimate will run. */
export const MARKOV_MINIMUM = 128;
export const LAG_MINIMUM = 256;

export type Sufficiency = "none" | "frequency-only" | "partial" | "complete";

export interface Adequacy {
  level: Sufficiency;
  /** What the current count supports, in one sentence. */
  summary: string;
  /** The next count that unlocks another method, or null once all four run. */
  nextThreshold: number | null;
  nextUnlocks: string | null;
}

/**
 * What a given number of observations actually supports.
 *
 * This reports the existing estimator gates rather than introducing a new
 * judgement. The distinction it draws is the one the capture screen has to
 * make: analysis can run on almost anything, and that is not the same as the
 * evidence being enough to decide on.
 */
export function adequacyOf(count: number): Adequacy {
  if (count === 0) {
    return {
      level: "none",
      summary: "Nothing recorded yet.",
      nextThreshold: 1,
      nextUnlocks: "the frequency estimate",
    };
  }
  if (count < MARKOV_MINIMUM) {
    return {
      level: "frequency-only",
      summary:
        "Enough to run the frequency estimate, which cannot see order. Both sequential methods will decline at this size, so a result here says little about predictability.",
      nextThreshold: MARKOV_MINIMUM,
      nextUnlocks: "the Markov estimate",
    };
  }
  if (count < LAG_MINIMUM) {
    return {
      level: "partial",
      summary:
        "Three of four methods will run. The lag predictor still declines, so repetition at a fixed distance would go undetected.",
      nextThreshold: LAG_MINIMUM,
      nextUnlocks: "the lag predictor",
    };
  }
  return {
    level: "complete",
    summary:
      "All four methods will run. Estimates may still be marked unstable: a figure can be produced long before it is settled.",
    nextThreshold: null,
    nextUnlocks: null,
  };
}
