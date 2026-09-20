# Reference comparison

EntropyLab's estimators against the NIST SP 800-90B reference implementation,
commit `87c104d0ed4cbc96103e7b8b38d6f2c7e0a6b289`.

The comparison binary is produced by `scripts/reference-comparison/extract.sh`,
which lifts the estimator functions out of NIST's own C++ sources rather than
reimplementing them. A disagreement in this table is a disagreement with NIST's
arithmetic. Regenerate with the commands in the header of `compare.ts`.

This is a methodology check. It is not a validation and confers no
certification.

| Fixture           | Estimator              | EntropyLab   | NIST reference | Absolute difference |
| ----------------- | ---------------------- | ------------ | -------------- | ------------------- |
| FAIR_LIKE         | mostCommonValue        | 2.3982616710 | 2.3982616710   | 0.00e+0             |
| FAIR_LIKE         | lagPredictor           | 2.4620141356 | 2.4620141356   | 0.00e+0             |
| FAIR_LIKE         | collisionPerEncodedBit | 1.0000000000 | 1.0000000000   | 0.00e+0             |
| BIASED            | mostCommonValue        | 1.4055369600 | 1.4055369600   | 0.00e+0             |
| BIASED            | lagPredictor           | 2.1732842828 | 2.1732842828   | 0.00e+0             |
| BIASED            | collisionPerEncodedBit | 0.5043458478 | 0.5043458478   | 0.00e+0             |
| PERIODIC_BALANCED | mostCommonValue        | 2.4814796532 | 2.4814796532   | 0.00e+0             |
| PERIODIC_BALANCED | lagPredictor           | 0.0000000000 | 0.0000000000   | 0.00e+0             |
| PERIODIC_BALANCED | collisionPerEncodedBit | 1.0000000000 | 1.0000000000   | 0.00e+0             |
| STICKY_MARKOV     | mostCommonValue        | 2.4232441351 | 2.4232441351   | 0.00e+0             |
| STICKY_MARKOV     | lagPredictor           | 0.5532850106 | 0.5532850106   | 0.00e+0             |
| STICKY_MARKOV     | collisionPerEncodedBit | 1.0000000000 | 1.0000000000   | 0.00e+0             |
| LOW_SAMPLE        | mostCommonValue        | 1.2222907666 | 1.2222907666   | 0.00e+0             |
| LOW_SAMPLE        | lagPredictor           | n/a          | 1.9002254217   | n/a                 |
| LOW_SAMPLE        | collisionPerEncodedBit | 0.5179301009 | 0.5179301009   | 0.00e+0             |

## What is comparable

| Estimator         | Comparable           | Why                                                                                                                                                                                                                                                                                                                            |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Most common value | Yes                  | Both run on the symbol alphabet. SP 800-90B places no binary restriction on this method.                                                                                                                                                                                                                                       |
| Lag predictor     | Yes                  | Both run on the symbol alphabet, both use the shared predictor conversion of section 6.3.7.                                                                                                                                                                                                                                    |
| Collision         | Yes, per encoded bit | Both run on the same three-bit serialisation. EntropyLab additionally scales to bits per symbol and caps at the alphabet ceiling, which the reference does not do because its section 3.1.3 workflow applies the cap elsewhere. The comparison is made before that step.                                                       |
| Markov            | No                   | The reference estimate is binary-only over a 2x2 matrix with six enumerated chains. EntropyLab's is a k-ary generalisation with confidence-bounded transitions and a dynamic programming path search. These compute different quantities and forcing agreement would mean changing one of them to no longer be what it claims. |

## Observed differences

Every comparable figure agrees to ten decimal places, on every fixture, with
an absolute difference of exactly zero at the printed precision. The one row
that does not agree is a deliberate policy difference rather than an
arithmetic one.

### LOW_SAMPLE, lag predictor: reference 1.9002, EntropyLab declines

The reference implementation runs its lag predictor whenever the input has
more than two symbols, and on the 40-observation fixture it returns 1.9002
bits per symbol. EntropyLab requires 256 observations before the estimator
will report anything, because a 128-lag scoreboard scored against 40 samples
has not observed most of its lags even once.

The difference matters more than its size suggests. 1.9002 bits per symbol
from 40 rolls is a confident-looking number resting on almost no evidence,
and acting on it is the exact failure this product exists to prevent. The
reference tool is not wrong to produce it: it is built to assess a validation
dataset of at least one million samples, where the question never arises. A
dice ceremony never reaches that size, so the applicability gate has to be
explicit here in a way it does not have to be there.

## Sample sizes

SP 800-90B assumes roughly 10^6 samples throughout. The campaign fixtures use
6000, which is already more than most physical ceremonies will produce. Every
figure in this table is therefore computed well below the sample size the
reference methods were designed around, for both implementations equally.
