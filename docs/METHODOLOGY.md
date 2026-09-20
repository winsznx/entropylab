# Methodology

What each estimator computes, where it comes from, what it assumes, and where
this implementation departs from its source.

EntropyLab is not a NIST SP 800-90B validation and confers no certification.
Four of the methods below are derived from that document; the departures are
listed rather than smoothed over.

## Methodology boundaries

Not every number EntropyLab reports carries the same authority. Some come
straight from a published algorithm, some come from an algorithm this project
adapted, and some are thresholds this project chose. Mixing those together
would let the credibility of the first category cover the third, so they are
separated here.

EntropyLab is **not** a NIST SP 800-90B validation. It performs no entropy
source validation, confers no certification, and its output is not a
substitute for either.

### A. Published algorithms used directly

Implemented as specified, on the data the specification says they apply to.
Both agree with the NIST reference implementation to ten decimal places on
every campaign fixture.

| Estimator         | Source                                                             | Note                                                               |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Most common value | SP 800-90B 6.3.1                                                   | Defined over an arbitrary alphabet; runs on d6 symbols unmodified. |
| Lag predictor     | SP 800-90B 6.3.8, with the predictor conversion of 6.3.7 to 6.3.10 | No alphabet restriction; runs on d6 symbols unmodified.            |

The only change in this category is clamping `-log2(1)` to `+0`.

### B. Published algorithms this project adapted

These produce useful numbers, but a reader must not treat them as the
published methods.

**Collision (SP 800-90B 6.3.2), two adaptations.**

1. The solve follows NIST's reference implementation rather than the text of
   step 7. The document describes a binary search against
   `F(1/z) = Gamma(3,z) z^-3 e^z`; the reference code notes the expression
   reduces to `X' = -2p^2 + 2p + 2` and solves the quadratic. These are
   equivalent by NIST's own derivation, and following the reference keeps
   results comparable with the tool practitioners run.
2. The result is capped at `log2(k)`. Scaling `n * H_bitstring` for a d6
   returns 3 bits per symbol whenever the bitstring shows no collision
   structure, which six faces cannot carry. SP 800-90B never prints that value
   because its section 3.1.3 takes a minimum against the symbol-alphabet
   estimate immediately; reported standalone, the uncapped product is an
   impossibility.

**Markov: a generalisation, not the published estimator.** This is the largest
departure in the project and the one to read before quoting any Markov figure.

The final specification's Markov estimate is binary-only, over a 2x2 matrix
with six enumerated candidate chains. EntropyLab runs a `k x k` matrix with a
dynamic programming search over all chains. It does not reduce to the published
method at `k = 2`: the published method uses raw transition proportions, this
uses confidence-bounded ones, and on identical binary input this reports the
lower figure.

The structure is not invented. The 2016 second draft of SP 800-90B specified a
general-alphabet Markov estimate for alphabets up to `k = 26`, built on a
`k x k` matrix of confidence-bounded transitions with a dynamic programming
path search. NIST removed it in the January 2018 final document, citing the
data needed to estimate a large transition matrix reliably.

One gap is unresolved and stated rather than papered over: the second draft's
own confidence term could not be recovered in full, because the available
source preserves that passage only as truncated tracked-changes text. The bound
applied here is the 99% one-sided normal bound the final document uses
everywhere else. Bounding every transition upward overestimates the best chain
and so underestimates entropy, which is the conservative direction, but it is
not the draft's term and is not described as such.

This estimator is excluded from the reference comparison because the reference
computes a different quantity. Forcing agreement would mean changing one of
them into something other than what it claims to be.

### C. Product-level thresholds chosen by this project

SP 800-90B states almost no per-estimator minimum sample size, because its
process assumes a validation dataset of at least 1,000,000 samples throughout.
A dice ceremony produces hundreds. The gap has to be filled by a judgement, and
these are the judgements. None of them is in the specification.

| Gate                              | Value                  | Effect                            | Why this value                                                                                                                                    |
| --------------------------------- | ---------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Most common value, unstable below | 100 observations       | Reports a number, marked unstable | Where the confidence term stops being a correction: at L = 100 it adds ~0.13 to `p_hat` for a fair d6                                             |
| Collision, unstable below         | 100 collision runs     | Reports a number, marked unstable | The variance term driving the bound is itself unreliable below this                                                                               |
| Markov, declines below            | 128 observations       | No number                         | The method maximises over a 128-symbol chain; fewer observations than the chain length is meaningless                                             |
| Markov, row sparsity              | 30 transitions per row | Result marked unstable            | Thin rows carry confidence bounds wide enough to dominate the path probability                                                                    |
| Lag predictor, declines below     | 256 observations       | No number                         | A 128-lag scoreboard needs each lag scored at least once; the reference tool runs from `L > 2` and will return a confident figure from 40 samples |
| Target guidance at zero bits      | Omitted                | No count shown                    | A process yielding nothing does not reach a target by being repeated                                                                              |

The lag gate is the most consequential. On the 40-observation fixture the NIST
reference returns 1.9002 bits per symbol; EntropyLab declines. The reference is
not wrong for its own purpose, but a confident figure from 40 rolls is the
specific failure this product exists to prevent.

**The combination rule is also a project decision**, though it follows NIST's
practice. The conservative figure is the lowest bits-per-symbol among
applicable estimators. Estimators that could not run are excluded, never
counted as zero, because counting them as zero would convert an underpowered
sample into a detected weakness.

### D. Where encoding influences the result

SP 800-90B restricts the collision and Markov estimates to binary input, and
section 3.1.3 handles non-binary sources by serialising each sample to its
`n`-bit representation.

That procedure assumes the source already emits `n`-bit values. A die does not.
Six faces do not fill a three-bit codeword, and the specification gives no
canonical mapping for a non-power-of-two alphabet. EntropyLab uses a
fixed-width big-endian encoding of the symbol index, and the consequence is
measurable:

Faces 0 to 5 encode as `000, 001, 010, 011, 100, 101`, seven ones in eighteen
bits. A perfectly fair die produces a bitstring with a one-rate near 0.389
rather than 0.5.

Any collision figure for a non-power-of-two alphabet therefore measures the
source and this encoding together and cannot be read as a property of the die
alone. Every such result carries that warning in the report. It is also why the
two estimators that run on symbols directly carry more weight for dice than the
two that do not.

### E. Reference comparison, and what it does and does not show

Every comparable estimator agrees with the NIST reference implementation to ten
decimal places on all five campaign fixtures. The comparison binary is built by
lifting the estimator functions out of NIST's own C++ rather than
reimplementing them, so a disagreement would be a disagreement with NIST's
arithmetic.

What that establishes: these implementations compute what they claim to
compute.

What it does not establish: that the estimates are correct for a physical
source, that the source is random, or that anything here is validated. The
comparison checks arithmetic against a reference, on synthetic data, at sample
sizes far below what either implementation was designed around.

### F. Why a small calibration sample is not a certification

SP 800-90B's assessment process assumes at least 1,000,000 samples collected
directly from the noise source, under a documented submission describing the
source's design. A physical dice calibration produces a few hundred rolls from
a process that a person operates and can change between sessions.

Three consequences follow, and they hold no matter how clean the numbers look:

1. **The confidence bounds do most of the work at these sizes.** A perfectly
   balanced 6000-roll d6 reports 2.481 bits per symbol against a 2.585 ideal.
   That 0.10 bit gap is the 99% bound, not a defect in the die. At a few
   hundred rolls the gap is larger still, so a low figure may reflect sample
   size rather than the source.
2. **A calibration sample describes what happened, not what will happen.** The
   estimators model the observed sequence. A human-operated process drifts:
   attention, grip, surface, and fatigue all change between a calibration
   session and a ceremony.
3. **Finding no structure is not evidence of its absence.** These four methods
   do not exhaust the ways a process can be predictable. A result at the
   alphabet ceiling means these methods found nothing.

What EntropyLab can honestly claim is that it measures evidence of bias and
predictability in a calibration process, reports which method limits the
estimate, and states what the figure rests on. It cannot claim a source is
random, and no output of this tool should be read that way.

## Summary

| Estimator         | Source                             | Runs on d6 directly      | Departs from source           |
| ----------------- | ---------------------------------- | ------------------------ | ----------------------------- |
| Most common value | SP 800-90B 6.3.1                   | Yes                      | No                            |
| Collision         | SP 800-90B 6.3.2                   | No, needs binarisation   | Closed form, alphabet ceiling |
| Markov            | SP 800-90B 6.3.3, 2016 draft 6.3.3 | Yes, as a generalisation | Yes, materially               |
| Lag predictor     | SP 800-90B 6.3.8                   | Yes                      | Applicability gate only       |

Every method returns a lower bound on min-entropy in bits per symbol under its
own model. The pipeline reports the lowest of them.

## The binary restriction, and why it shapes everything

SP 800-90B states, in section 6.3:

> The Collision, Markov and Compression estimates are only applied to binary
> inputs.

The restriction is repeated at the head of each of those sections. It is not
presentational. In the collision method a run between repeats is always length
2 or 3 for a two-symbol alphabet, and that fact is what makes its closed-form
solution valid. In the Markov method the transition matrix is fixed at 2x2 and
the candidate chains are enumerated by hand.

Section 3.1.3 gives the route for non-binary sources: serialise each sample to
its n-bit representation, run the binary estimators over the resulting
bitstring to get `H_bitstring`, and combine as
`H_I = min(H_original, n * H_bitstring, H_submitter)`.

That procedure assumes the source already emits n-bit values. A die does not.
Six faces do not fill a three-bit codeword, and SP 800-90B gives no canonical
mapping for a non-power-of-two alphabet. EntropyLab uses a fixed-width
big-endian encoding of the symbol index and records the consequence with every
result that depends on it:

Faces 0 to 5 encode as `000, 001, 010, 011, 100, 101`, which is seven ones in
eighteen bits. A perfectly fair die produces a bitstring with a one-rate near
0.389 rather than 0.5. Any figure derived from that bitstring measures the
source and this encoding together and cannot be read as a property of the die.

This is why the two estimators that run on symbols directly, most common value
and the lag predictor, carry more weight for dice than the two that do not.

## Most common value

**Source:** SP 800-90B section 6.3.1. Defined over an arbitrary alphabet
`A = {x_1, ..., x_k}`, with no binary restriction.

```
p_hat = max_i (count of symbol i) / L
p_u   = min(1, p_hat + 2.576 * sqrt(p_hat * (1 - p_hat) / (L - 1)))
H     = -log2(p_u)
```

`2.576` is `Z(1 - 0.005)`, the 99% one-sided normal quantile. The
implementation uses `2.5758293035489008`, matching `ZALPHA` in the NIST
reference implementation.

**Assumes:** observations are independent and identically distributed. Under
serial dependence the bound is still computed, but it describes only the
marginal distribution.

**Blind spot, by construction:** the method sees the multiset of symbols and
nothing else. Reordering the input cannot change its output. It therefore rates
`0,1,2,3,4,5` repeating as near-ideal, which is a correct result for this
method and the reason the pipeline cannot consist of it alone. There is a test
asserting this invariance so the property stays visible.

**Sample size:** SP 800-90B states no method-specific minimum and assumes
roughly 10^6 samples across its process. EntropyLab marks results below 100
observations unstable, chosen where the confidence term stops being a
correction and starts being the answer: at L = 100 it adds about 0.13 to
`p_hat` for a fair d6.

**Departure from source:** none, beyond clamping `-log2(1)` to `+0`.

**Verified:** reproduces the worked example in section 6.3.1, and agrees with
the NIST reference binary to ten decimal places on all five fixtures. The
specification's prose has an arithmetic slip in that example, printing 0.6822
where its own stated steps give `p_u = 0.6895`; the reference implementation
computes 0.6895 and so does this one.

## Collision

**Source:** SP 800-90B section 6.3.2. Binary inputs only.

Walk the bitstring cutting a run at each repeat, collect run lengths `t_i`,
then:

```
X_bar   = mean(t_i)
sigma   = sample standard deviation of t_i
X_bar'  = X_bar - 2.576 * sigma / sqrt(v)
```

and solve for `p`, with `H = -log2(p)`.

**Departure one, the solve.** Section 6.3.2 step 7 describes a binary search
for `p` against `F(1/z) = Gamma(3,z) * z^-3 * e^z`. The NIST reference
implementation does not do this. Its source notes that the expression reduces
to `X_bar' = -2p^2 + 2p + 2` and solves the quadratic directly, taking the root
above 1/2. EntropyLab follows the reference implementation so that results stay
comparable with the tool practitioners actually run. The two are equivalent by
NIST's own derivation.

Step 8's fallback is preserved: when `X_bar'` exceeds 2.5 the quadratic has no
real root and the estimate is capped at one bit per bit. Below 2.0 the bound is
clamped, 2.0 being the smallest mean run length a binary sequence can have.

**Departure two, the alphabet ceiling.** Scaling `n * H_bitstring` for a d6
returns `3 * 1 = 3` bits per symbol whenever the bitstring shows no collision
structure. Six faces cannot carry three bits. SP 800-90B never prints such a
value because section 3.1.3 immediately takes a minimum against the
symbol-alphabet estimate, which is bounded by `log2(k)`. Reported in isolation
the unclamped product is an impossibility, so EntropyLab caps at `log2(k)` and
marks the result saturated. A saturated result means this method found nothing,
not that the source is strong.

**Assumes:** the bitstring is a faithful rendering of the source. For a
non-power-of-two alphabet it is not, as described above.

**Sample size:** unstable below 100 collision runs, where the variance term
driving the confidence bound is itself unreliable.

**Verified:** reproduces every intermediate of the worked example in section
6.3.2 from its published 40-bit input, and agrees with the NIST reference
binary to ten decimal places per encoded bit on all five fixtures.

## Markov

**Source:** SP 800-90B section 6.3.3 for the structure of the result; the 2016
second draft of SP 800-90B for the general-alphabet form.

This is the one estimator that departs materially from the published method,
and the reason is specific. The final specification's Markov estimate is
binary-only. Routing a d6 through the section 3.1.3 bitstring conversion would
destroy exactly the structure this estimator exists to find: the dependency in
a dice process is between faces, not between the bits of their encoding.

The 2016 second draft specified a general-alphabet Markov estimate for
alphabets up to `k = 26`, built on a `k x k` matrix of confidence-bounded
transition probabilities with a dynamic programming search for the
highest-probability path. NIST removed it in the January 2018 final document,
citing the data required to estimate a large transition matrix reliably. That
concern is real and is the reason this implementation reports row sparsity and
marks the result unstable when any row is thin.

EntropyLab implements that structure:

1. Estimate the initial distribution and the `k x k` transition matrix from
   observed counts.
2. Apply a 99% one-sided upper bound to every entry.
3. Find the most probable chain of 128 symbols by dynamic programming in log
   space.
4. Report `min(-log2(P_max) / 128, log2(k))`.

The chain length of 128 and the normalisation by it are taken from section
6.3.3.

**Known gaps, stated plainly:**

- This is not the estimator in the final specification and does not reduce to
  it at `k = 2`. The published binary method enumerates six candidate chains
  using raw transition proportions; this searches all chains using bounded
  proportions, and reports the lower figure on identical input.
- The second draft's own confidence term could not be recovered in full from
  the available source, which preserves that passage only as truncated
  tracked-changes text. The bound applied here is the 99% one-sided normal
  bound the final document uses everywhere else. Overestimating every
  transition probability overestimates the best chain and so underestimates
  entropy, which is the conservative direction, but it is not the draft's
  original term and should not be described as such.
- It is not compared against the reference tool, because the reference computes
  a different quantity. Forcing agreement would mean changing one of them into
  something other than what it claims to be.

**Assumes:** a first-order chain. Dependence spanning more than one step is
invisible to it, which is part of why the lag predictor runs alongside.

**Sample size:** declines below 128 observations. Rows with fewer than 30
outgoing transitions are flagged and the result marked unstable.

## Lag predictor

**Source:** SP 800-90B section 6.3.8, with the shared predictor conversion from
sections 6.3.7 to 6.3.10.

128 predictors run in parallel, one per lag distance. Predictor `d` guesses
that the next symbol equals the symbol `d` positions back. Each is scored as
the sequence is consumed, ties resolving to the more recent lag, and the
best-scoring lag makes the actual prediction.

The conversion takes the largest of three quantities:

```
p_global' = min(1, p_global + 2.576 * sqrt(p_global (1 - p_global) / (N - 1)))
            or 1 - 0.01^(1/N) when no prediction succeeded
p_local   = solves 0.99 = [(1 - p x) / ((r + 1 - r x) q)] * x^-(N+1)
            where r = longest correct run + 1, and x solves x = 1 + q p^r x^(r+1)
1/k       the rate a guesser achieves
H = -log2(max of the three)
```

The local term is what lets this method see determinism that an average hides.
A source that is perfectly predictable for a long stretch and random elsewhere
holds an unremarkable global success rate while being catastrophically weak,
and only run length reflects that.

`D = 128` is taken from the specification and is not tuned. A threshold chosen
to make a fixture look good would make the result a statement about the tuning.
It does bound what this method can see: a period longer than 128 is invisible
to it, and that limitation is recorded in the result.

**Assumes:** nothing about the alphabet. This method and the most common value
estimate are the two that apply to dice exactly as published.

**Not blind to marginal bias, contrary to the obvious assumption.** Guessing a
repeat succeeds at rate `sum(p_i^2)`, which rises with bias, so a skewed source
raises this estimator's accuracy. It reports a defect in the marginals weakly
rather than not at all, and on such a source it sits above the frequency
estimator. This was found by test and is asserted there.

**Sample size:** declines below 256 observations. The specification permits
running at `L > 2`; EntropyLab does not, because a 128-lag scoreboard scored
against a few dozen samples has not observed most of its lags even once. The
reference tool returns 1.9002 bits per symbol for the 40-observation fixture
where this implementation declines. That is the single deliberate divergence in
the comparison and it is discussed in
[proof-campaign/reference-comparison.md](./proof-campaign/reference-comparison.md).

**Verified:** agrees with the NIST reference binary to ten decimal places on
the four fixtures where both produce a figure.

## Combining the estimates

The conservative figure is the lowest bits-per-symbol among the estimators that
applied.

Each estimator bounds min-entropy under a different model of how the source
could be predicted, and the models are not nested: frequency concentration,
collision behaviour, first-order transitions and fixed-offset repetition are
different attacks. A source is only as strong as the best attack against it, so
the smallest bound governs. SP 800-90B applies the same rule across its own
non-IID battery.

The rule does not average, vote, or discard outliers. One estimator finding
structure is sufficient evidence of structure. Four finding nothing is not
evidence of its absence, which is why a conservative figure sitting at the
alphabet ceiling is reported as "nothing found" rather than as a pass.

An estimator that could not run is excluded, never counted as zero bits.
Counting it as zero would turn an underpowered sample into a detected weakness,
the mirror image of the error this tool exists to prevent.

## Sample sizes, overall

SP 800-90B assumes a validation dataset of at least 1,000,000 samples. No
physical dice ceremony produces that. Every figure EntropyLab reports is
computed far below the sample size these methods were designed around, which is
why applicability gates and instability flags are part of the result rather
than footnotes to it.

## What none of this establishes

Statistical testing can find structure. It cannot establish its absence. These
four methods do not exhaust the ways a physical process can be predictable, and
a source that passes all of them may still be predictable by a method not
implemented here. A calibration sample describes what was observed, not what
the process will do next, and human-operated processes drift.
