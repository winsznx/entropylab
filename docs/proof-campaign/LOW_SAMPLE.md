# Entropy profile: Low-sample d6

EntropyLab profiles an entropy-generation process. It does not generate, inspect, or handle seed material.

## Result

**1.2223 bits per symbol** (conservative estimate, against an ideal of 2.5850 for a 6-symbol alphabet).

Limiting estimator: **Most common value**.

## Dataset

| Field                | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Source               | LOW_SAMPLE                                                         |
| Observations         | 40                                                                 |
| Alphabet size        | 6                                                                  |
| Collection method    | synthetic fixture LOW_SAMPLE                                       |
| Input hash (SHA-256) | `887ecac0eb4ae5f5f1f6909f56c2bdbc4555867d77f67654f5cfec72497b5511` |
| Algorithm version    | 0.1.0                                                              |
| Report format        | 1.0.0                                                              |

## Estimators

| Estimator         | Bits per symbol | Status                          |
| ----------------- | --------------- | ------------------------------- |
| Most common value | 1.2223          | unstable, treat as indicative   |
| Collision         | 1.5538          | unstable, treat as indicative   |
| Markov            | not applicable  | declined (insufficient-samples) |
| Lag predictor     | not applicable  | declined (insufficient-samples) |

## What to know about this result

- 2 of 4 estimators could not run: Markov, Lag predictor. The figure below is the lowest of those that did, and a method that could not run may have found something the others missed.
- The limiting estimator (Most common value) reported an unstable result, so the headline figure rests on the weakest evidence in the set. Collect more observations before relying on it.
- **Most common value:** Only 40 observations. The 99% confidence term contributes 0.179 to the bound, which is large relative to the observed proportion of 0.250. Treat this as indicative.
- **Collision:** Only 46 collision runs were observed. The variance term is unreliable at this size; treat the result as indicative.
- **Collision:** This estimate is computed over a 3-bit encoding of a 6-symbol alphabet. Because 6 is not a power of two, unreachable codewords bias the bitstring (observed one-rate 0.4333) independently of the source. The figure describes the source and this encoding together, not the source alone.
- **Markov:** The method maximises over a chain of 128 symbols and needs at least that many observations. Received 40.
- **Lag predictor:** Tracking 128 lags needs at least 256 observations for the widest lag to be scored at all. Received 40.

## Target guidance

| Target   | Observations required at the measured rate |
| -------- | ------------------------------------------ |
| 128 bits | 105                                        |
| 256 bits | 210                                        |

These counts follow from the calibration sample. They are guidance, not a guarantee about observations that have not been made yet.

## Assumptions

- The observations were produced by the same physical process the report describes.
- Observations are recorded in the order they occurred. Every sequential estimator depends on this.
- The alphabet is fixed and every outcome was recorded, including repeats and results the operator disliked.
- The calibration sample is representative of how the process will behave during the ceremony it is meant to inform.

## Limitations

- Statistical testing cannot establish that a source is random. It can only find structure, and finding none is not proof that none exists.
- These four estimators do not exhaust the ways a physical process can be predictable. A source can pass all of them and still be predictable by a method not implemented here.
- The result describes the observed sample. It does not guarantee how the process will behave later, and human-operated processes drift.
- Small samples produce unstable estimates. Where an estimator reports instability, the figure can move substantially with more data.
- A figure at the alphabet ceiling means no structure was found, not that the source was shown to be strong.
- This is not a NIST SP 800-90B validation and confers no certification. Estimators derived from that document are noted individually, including where this implementation diverges from it.
- Entropy quality is one part of seed security. It does not address the wallet, the derivation, the operating system, or physical observation of the ceremony.
