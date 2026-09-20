import { Z_ALPHA } from "./constants.js";

/** Confidence level used by the local-predictability solve, per SP 800-90B. */
const ALPHA = 0.99;

export interface PredictionOutcome {
  /** Number of predictions attempted. */
  attempts: number;
  /** Number of predictions that were correct. */
  correct: number;
  /** Length of the longest unbroken run of correct predictions. */
  longestRun: number;
}

export interface PredictionEstimate {
  bitsPerSymbol: number;
  pGlobal: number;
  pGlobalUpper: number;
  pLocal: number;
  /** Which of the three terms determined the result. */
  governedBy: "global" | "local" | "alphabet-floor";
  pLocalConverged: boolean;
}

/**
 * Converts prediction performance into a min-entropy estimate.
 *
 * This is the shared machinery of SP 800-90B sections 6.3.7 through 6.3.10.
 * Every predictor-based estimate in the specification, including the lag
 * predictor, ends here, so it is implemented once.
 *
 * Three quantities compete and the largest wins:
 *
 *   p_global'  a 99% upper bound on the overall success rate
 *   p_local    a bound derived from the longest run of correct predictions
 *   1/k        the rate a predictor achieves by guessing, which floors the result
 *
 * The final estimate is -log2 of that maximum.
 *
 * The local term is what makes this framework able to see determinism that the
 * global rate averages away. A source that is perfectly predictable for a long
 * stretch and random elsewhere can hold a mediocre global success rate while
 * being catastrophically weak, and only the run-length term reflects that.
 */
export function predictionEstimate(
  outcome: PredictionOutcome,
  alphabetSize: number,
): PredictionEstimate {
  const { attempts: n, correct: c, longestRun } = outcome;

  const pGlobal = c / n;
  const pGlobalUpper =
    pGlobal === 0
      ? 1 - Math.pow(0.01, 1 / n)
      : Math.min(1, pGlobal + Z_ALPHA * Math.sqrt((pGlobal * (1 - pGlobal)) / (n - 1)));

  const r = longestRun + 1;
  const local = solveLocalPredictability(r, n);

  const floor = 1 / alphabetSize;
  const winner = Math.max(pGlobalUpper, local.value, floor);

  let governedBy: PredictionEstimate["governedBy"] = "alphabet-floor";
  if (winner === pGlobalUpper && pGlobalUpper >= local.value) governedBy = "global";
  else if (winner === local.value) governedBy = "local";

  return {
    bitsPerSymbol: Math.max(0, -Math.log2(winner)),
    pGlobal,
    pGlobalUpper,
    pLocal: local.value,
    governedBy,
    pLocalConverged: local.converged,
  };
}

/**
 * Solves for p_local, the probability consistent with observing a longest
 * correct-prediction run of r - 1 in n attempts at the 99% level.
 *
 * SP 800-90B poses this as
 *
 *   0.99 = [ (1 - p x) / ((r + 1 - r x) q) ] * x^-(n+1)
 *
 * where q = 1 - p and x solves the recurrence x = 1 + q p^r x^(r+1). The
 * expression is evaluated in log space and inverted by bisection, because the
 * direct form underflows for the run lengths that matter here.
 */
function solveLocalPredictability(r: number, n: number): { value: number; converged: boolean } {
  const target = Math.log(ALPHA);

  let low = 0;
  let high = 1;
  let converged = false;

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const mid = (low + high) / 2;
    const value = logProbabilityOfNoLongerRun(mid, r, n);

    if (!Number.isFinite(value)) {
      // Past the point where the expression is numerically meaningful; the
      // true root lies below.
      high = mid;
      continue;
    }

    // The expression decreases in p: a larger success probability makes a run
    // of this length more likely, so the probability of not exceeding it falls.
    if (value > target) low = mid;
    else high = mid;

    if (high - low < 1e-12) {
      converged = true;
      break;
    }
  }

  return { value: (low + high) / 2, converged };
}

/** Log probability that n attempts contain no correct run of length r or more. */
function logProbabilityOfNoLongerRun(p: number, r: number, n: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return -Infinity;

  const q = 1 - p;

  // Fixed point of x = 1 + q p^r x^(r+1). For the large r that a near
  // deterministic source produces, p^r underflows and x settles at 1, which is
  // the correct limit rather than a failure.
  let x = 1;
  for (let i = 0; i < 128; i += 1) {
    const next = 1 + q * Math.pow(p, r) * Math.pow(x, r + 1);
    if (!Number.isFinite(next)) return -Infinity;
    if (Math.abs(next - x) < 1e-15) break;
    x = next;
  }

  const numerator = 1 - p * x;
  const denominator = (r + 1 - r * x) * q;
  if (numerator <= 0 || denominator <= 0) return -Infinity;

  return Math.log(numerator) - Math.log(denominator) - (n + 1) * Math.log(x);
}
