/**
 * Upper 99% one-sided normal quantile, Z(1 - 0.005).
 *
 * SP 800-90B uses this single constant for every confidence bound it takes:
 * the upper bound on the most common value's probability (6.3.1), the lower
 * bound on mean collision time (6.3.2), and the upper bound on predictor
 * accuracy (6.3.7 onward). The value matches ZALPHA in the NIST reference
 * implementation (cpp/shared/utils.h).
 */
export const Z_ALPHA = 2.5758293035489008;
