/**
 * Canonical data model for EntropyLab.
 *
 * Every estimator consumes an {@link EntropySample} and returns an
 * {@link EstimatorResult}. Nothing in this module performs I/O, reads a clock,
 * or touches the network: results are a pure function of the input.
 */

/** A symbol drawn from a finite alphabet, encoded as an index in `[0, alphabetSize)`. */
export type SymbolId = number;

/** A recorded calibration sequence from one physical process. */
export interface EntropySample {
  /** Number of distinct symbols the process can emit. Must be >= 2. */
  alphabetSize: number;
  /** Observations in the order they were produced. Order is significant. */
  observations: SymbolId[];
}

/**
 * Why an estimator declined to produce a number.
 *
 * An estimator must return one of these rather than a substituted value when it
 * cannot run. Silently emitting a placeholder would let an underpowered dataset
 * masquerade as a measured result.
 */
export type InapplicabilityReason =
  "insufficient-samples" | "alphabet-unsupported" | "assumption-violated" | "numerical-failure";

/** How much weight the reported number can carry. */
export type EstimateQuality =
  /** Sample size is at or above the level the method's authors expect. */
  | "usable"
  /** Produces a number, but below the reference sample size; treat as indicative. */
  | "unstable"
  /** No number produced. */
  | "not-applicable";

export interface EstimatorResult {
  /** Stable machine identifier, e.g. `most-common-value`. */
  id: string;
  /** Human-readable name for reports and UI. */
  label: string;
  /** True when the estimator produced a defensible number. */
  applicable: boolean;
  /** Present iff `applicable`. Estimated min-entropy lower bound, in bits per symbol. */
  bitsPerSymbol?: number;
  /** Signals whether `bitsPerSymbol` should be trusted as a headline figure. */
  quality: EstimateQuality;
  /** Present iff `!applicable`. */
  inapplicabilityReason?: InapplicabilityReason;
  /** Conditions the reader must know about, even when a number was produced. */
  warnings: string[];
  /** Estimator-specific intermediate values, for auditing and visualisation. */
  diagnostics: Record<string, unknown>;
}

/** Contract implemented by every estimator in the pipeline. */
export interface Estimator {
  id: string;
  label: string;
  /**
   * Must be deterministic and side-effect free. Must not throw on adversarial
   * input: an input it cannot handle is reported as `applicable: false`.
   */
  run(sample: EntropySample): EstimatorResult;
}

export interface TargetGuidance {
  /** Entropy target the user is aiming for, e.g. 128 or 256 bits. */
  targetBits: number;
  /** Observations required at the conservative rate. Absent when no rate was established. */
  estimatedSamplesRequired?: number;
}

export interface EntropyAnalysis {
  /** Version of the estimator implementations that produced this analysis. */
  version: string;
  sampleCount: number;
  alphabetSize: number;
  /** Maximum bits per symbol an ideal source over this alphabet could provide. */
  idealBitsPerSymbol: number;
  estimators: EstimatorResult[];
  /** `id` of the estimator that produced the lowest applicable estimate. */
  limitingEstimator?: string;
  /** The lowest applicable per-symbol estimate. Absent when no estimator applied. */
  conservativeBitsPerSymbol?: number;
  targetGuidance: TargetGuidance[];
  /** Analysis-level warnings, distinct from per-estimator warnings. */
  warnings: string[];
}
