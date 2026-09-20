# Physical calibration data

Real observations from a physical process, recorded by hand.

This directory is empty of real data until a session has actually been rolled.
No file here contains invented observations, and none ever should: a fabricated
calibration set would make every figure derived from it meaningless while
looking exactly like a real one.

## Safety

These are calibration observations. They exist to measure a process.

**Never reuse calibration observations as seed material.** They are committed to
a public repository, and anything published here is public forever. Roll a
fresh, unrecorded sequence for an actual ceremony.

## File format

One session per file, named `physical-d6-session-N.txt`.

- Symbols are written the way they are read off the die: `1` through `6`.
- Separate them with spaces, commas, or newlines. Mixed layouts are fine.
- Lines beginning with `#` are comments and are ignored by the parser.
- Blank lines are ignored.

Record the observations in the order they occurred. Every sequential estimator
depends on that order, so a file sorted or tidied after the fact is not a
calibration sample any more.

Record every roll, including repeats and results that look wrong. Dropping a
roll because it "didn't count" is itself a bias, and it is invisible in the
resulting file.

### Example

`data/physical/EXAMPLE-session.txt` shows the layout. It contains **example
observations, not real ones**, and is excluded from the campaign runner. It
exists only so the format is unambiguous.

## How many rolls, and why

The pipeline was run against synthetic sessions before any real data existed,
to find out what a given session size actually supports. The answer changes the
recommendation, so it is recorded here rather than left to be discovered.

| Total | Per session | What runs                                                                                          |
| ----- | ----------- | -------------------------------------------------------------------------------------------------- |
| 600   | 200         | Combined analysis is sound. Per session, the lag predictor **declines** and Markov rows go sparse. |
| 768   | 256         | All four estimators run per session. This is the smallest size that does.                          |
| ~3300 | 1100        | Markov rows reach 30 observations each per session, so nothing is marked unstable.                 |

Two gates drive this:

- The lag predictor needs 256 observations, because it scores 128 lags and
  below that most lags have never been observed.
- Markov marks a result unstable when any face has fewer than 30 outgoing
  transitions. With six faces that needs roughly 180 rolls per face.

**600 rolls across three sessions of 200 is workable** and is the recommended
minimum. The combined figure is the headline, and every estimator runs on it.
The per-session figures are for comparison only: they answer whether the
process drifted, not what the entropy rate is.

**If 768 rolls is tolerable, prefer three sessions of 256.** That is a modest
increase and it lets the lag predictor run on each session individually, which
makes the drift comparison much stronger.

Do not pad a session to reach a threshold by rolling faster or less carefully.
A larger sample of a changed process is worse than a smaller sample of the real
one.

## Session protocol

The campaign expects three sessions of 256 valid observations, 768 total. The
runner rejects a session with a different count rather than analysing it, so a
miscount is caught before it reaches a published figure; set
`EXPECTED_PER_SESSION` if a session was deliberately a different length.

The full public protocol, including the invalid-roll rule and why per-session
and combined results are reported separately, is in
[docs/CAMPAIGN-F-PROTOCOL.md](../../docs/CAMPAIGN-F-PROTOCOL.md).

Keep constant across sessions:

- the same die
- the same throwing surface
- the same cup, hand, or release method
- the same person

Vary only the session boundary. Sessions exist to answer whether the process is
stable over time, which is the question a single long sequence cannot answer.

Record in the header comment of each file:

```
# session: 1
# date: 2026-09-21
# die: white acrylic d6, 16mm
# surface: felt mat
# method: shaken in cup, dropped from ~20cm
# operator notes: anything unusual
```

Those notes are not decoration. When a session disagrees with the others, they
are the only record of what differed.

## Running the campaign

Once session files exist:

```bash
pnpm campaign:physical
```

That writes per-session reports, a combined report, and a cross-session
comparison to `docs/proof-campaign/physical/`. The runner exits without writing
anything if no session files are present.

## What the result will and will not be

A practical calibration demonstration, on a few hundred rolls.

It is not formal entropy-source certification. SP 800-90B's assessment process
assumes at least 1,000,000 samples and a documented submission describing the
source. Six hundred rolls support a decision about whether to trust a procedure.
They do not support a certification, and the generated report says so.
