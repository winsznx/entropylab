import type { EntropySample } from "./types.js";

/** Bits used to encode one symbol of the given alphabet. */
export function bitsPerSymbolEncoding(alphabetSize: number): number {
  return Math.max(1, Math.ceil(Math.log2(alphabetSize)));
}

export interface Binarization {
  sample: EntropySample;
  /** Bits emitted per source symbol. */
  bitsPerSymbol: number;
  /**
   * True when the alphabet is not a power of two, so some codewords are
   * unreachable and the bitstring carries structure the source does not have.
   */
  encodingArtifact: boolean;
  /** Proportion of ones in the resulting bitstring. */
  oneRate: number;
}

/**
 * Serialises a symbol sequence into a bitstring, as required by SP 800-90B
 * section 3.1.3 before the binary-only estimators can be applied.
 *
 * The specification assumes each sample is already an n-bit value from the
 * noise source. A die is not: six faces do not fill a 3-bit codeword, and
 * SP 800-90B gives no canonical mapping for a non-power-of-two alphabet. The
 * choice made here is the simplest defensible one, a fixed-width big-endian
 * encoding of the symbol index, and it is recorded in the result rather than
 * left implicit.
 *
 * The consequence matters and is reported through `encodingArtifact`. For a
 * perfectly fair d6, faces 0..5 encode to 000,001,010,011,100,101, which
 * contains 7 ones across 18 bits. The bitstring is measurably biased toward
 * zero even though the die is not. Any estimate derived from this bitstring
 * therefore measures the source and the encoding together, and cannot be read
 * as a property of the source alone.
 */
export function binarize(sample: EntropySample): Binarization {
  const width = bitsPerSymbolEncoding(sample.alphabetSize);
  const bits: number[] = [];
  let ones = 0;

  for (const symbol of sample.observations) {
    for (let b = width - 1; b >= 0; b -= 1) {
      const bit = (symbol >> b) & 1;
      bits.push(bit);
      ones += bit;
    }
  }

  return {
    sample: { alphabetSize: 2, observations: bits },
    bitsPerSymbol: width,
    encodingArtifact: (sample.alphabetSize & (sample.alphabetSize - 1)) !== 0,
    oneRate: bits.length === 0 ? 0 : ones / bits.length,
  };
}
