/**
 * Deterministic PRNG for fixture generation.
 *
 * `Math.random` is unsuitable here: every dataset in the proof campaign must
 * regenerate byte-identically on any machine and any Node version, otherwise a
 * published estimator result cannot be re-derived by a reader.
 *
 * This is sfc32 seeded through splitmix32. It is a statistical generator for
 * building test data and is not used anywhere in the analysis path.
 */
export class SeededRandom {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    this.a = splitmix32(h);
    this.b = splitmix32(this.a);
    this.c = splitmix32(this.b);
    this.d = splitmix32(this.c);
    // Discard early output, which correlates with the seed material.
    for (let i = 0; i < 16; i += 1) this.nextFloat();
  }

  /** Uniform in [0, 1). */
  nextFloat(): number {
    const t = (this.a + this.b) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    this.d = (this.d + 1) >>> 0;
    const result = (t + this.d) >>> 0;
    return result / 4294967296;
  }

  /** Uniform integer in [0, bound). */
  nextInt(bound: number): number {
    return Math.floor(this.nextFloat() * bound);
  }

  /** Samples an index from a weight vector. Weights need not be normalised. */
  pick(weights: number[]): number {
    let total = 0;
    for (const w of weights) total += w;
    let target = this.nextFloat() * total;
    for (let i = 0; i < weights.length; i += 1) {
      target -= weights[i] as number;
      if (target < 0) return i;
    }
    return weights.length - 1;
  }
}

function splitmix32(seed: number): number {
  let z = (seed + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
}
