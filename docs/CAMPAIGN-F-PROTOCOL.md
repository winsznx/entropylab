# Campaign F protocol: physical dice

The public protocol for the one campaign that uses real observations. Every
other dataset in this repository is synthetic and labelled as such.

## Provenance is not optional

Two kinds of dataset appear in this project and they must never be confused:

| Label                             | What it is                                                                             | Where it lives                                             |
| --------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Synthetic adversarial fixture** | Generated from a seeded PRNG with a defect deliberately injected. Never touched a die. | `packages/fixtures`, results in `docs/proof-campaign`      |
| **Physical calibration sample**   | Rolled by a person and recorded by hand.                                               | `data/physical`, results in `docs/proof-campaign/physical` |

The synthetic fixtures exist to test the estimators against defects whose
answers are known in advance. They are not evidence about any real die. The
physical sample is evidence about one die, rolled one way, by one person, on
one set of occasions, and about nothing else.

## What is recorded

Per session, in the file header as `#` comments:

- session number
- collection date
- description of the die
- throwing surface and release method
- operator
- the invalid-roll rule in force
- anything unusual

The observations themselves are the rest of the file, in the order they
occurred.

## The invalid-roll rule

Declared before rolling and applied without exception.

**A roll counts unless the die fails to come to rest flat inside the throwing
area.** A cocked die, one that leaves the area, or one that lands on a
different surface is re-rolled and neither outcome is recorded.

Nothing else is grounds for a re-roll. A face that has come up four times
running is a valid observation. Discarding a result because it looks wrong is
the most direct way to bias a calibration sample, and it leaves no trace in the
file.

## Sessions

Three sessions, 256 valid observations each, 768 total.

Held constant across sessions: the die, the surface, the release method, the
operator. Only the session boundary varies.

256 is chosen rather than 200 because the lag predictor needs 256 observations
before it will report anything: it scores 128 lags, and below that most lags
have not been observed once. At 200 per session it declines outright, and the
per-session comparison loses its strongest instrument.

## Two questions, two analyses

These are reported separately and must not be merged.

**Per session** answers whether the process stayed the same. Three independent
figures from the same die and method should be close; a wide spread is evidence
the process moved between sessions, which a single combined number would hide.
At 256 observations these figures are individually weak, and some estimators
will mark themselves unstable. They are a comparison, not a measurement.

**Combined** answers what the process produced across 768 observations. It is
the better measurement and the worse drift detector: concatenating sessions
that differ produces a number describing a process that never existed.

If the sessions disagree, the combined figure is reported with that
disagreement stated beside it, and the disagreement is the finding.

## Procedure

1. Validate syntax; reject the campaign on any unreadable token rather than
   skipping it.
2. Confirm the declared count per session.
3. Hash each session before analysis, and hash the combined dataset.
4. Analyse each session independently.
5. Analyse the combined 768 observations.
6. Compare across sessions: distribution drift, repeat behaviour, transition
   structure, estimator disagreement, unexpected instability.
7. Preserve the generated outputs exactly.

Comparison against `FAIR_LIKE` is made only where it is meaningful. The
synthetic control has 6000 observations; a 768-observation sample carries wider
confidence bounds, so a lower figure may be the sample size rather than the
die. Where the two are compared, they are compared at matched sample sizes or
not at all.

## Raw data is never edited

The recorded files are the evidence. They are not cleaned, normalised,
deduplicated, reordered, or corrected. Provenance and commentary go in the
header comments or in this document, never into the observations.

If the physical data looks strange, it stays strange. A real die that turns out
to be measurably biased is a better result than a tidy one, and hiding it would
defeat the purpose of building the tool.

## What the result will say

> This is a practical calibration demonstration using 768 physical
> observations. It is not formal entropy-source certification.

SP 800-90B's assessment process assumes at least 1,000,000 samples from a
documented noise source. 768 hand-recorded rolls do not approach that and are
not claimed to. They support a decision about whether to trust one procedure,
made by the person who performed it.

## Status

Awaiting recorded sessions. `data/physical` contains no observations, and
`pnpm campaign:physical` exits without writing until session files exist.
