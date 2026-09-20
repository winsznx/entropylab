# Demo script

Target four minutes. One argument, not a tour.

**The argument:** balanced counts do not imply unpredictability, and counting
rolls is the check almost everyone applies.

Everything below runs from the application at normal speed. No console, no
repository, no editor, except for the last fifteen seconds.

---

## 0:00 to 0:25 — the problem

Screen: home.

> Guides tell you to roll dice for your Bitcoin seed. The usual check is
> counting: 99 rolls of a d6, about 2.585 bits each, call it 256 bits, done.
> That arithmetic assumes every roll is worth a full share. Nobody checks
> whether it is.

Do not explain the tool yet.

## 0:25 to 0:55 — a source that passes the usual check

Screen: home, scroll to the demonstration already on the page.

> Here is a dice sequence. Every face appears exactly the same number of times.
> A histogram of it is flat. Frequency analysis rates it 2.4815 bits per roll,
> near the 2.5850 ceiling for six faces.

Let the number sit for a beat.

> By the check most people apply, this is a good source.

## 0:55 to 1:30 — the collapse

Still on the home demonstration, then click through to the analysis.

> The sequence is one, two, three, four, five, six, repeating.

Point at the scale.

> One method still reads 2.48, out near the ceiling. The governing figure is
> zero. Every tick on this bar is a different method; the lowest one governs,
> and everything to its right is hatched because another method contradicts it.

Read the finding aloud from the screen:

> "The counts look balanced, but the order is predictable."

> Frequency analysis cannot see order. That is not a bug in it. It is why one
> estimator is not enough.

This is the centre of the demo. Do not rush it.

## 1:30 to 2:05 — a different failure, a different answer

Open the sticky dataset from the demo list.

> A different defect: a die that often fails to tumble and repeats its previous
> face. The histogram is within a rounding error of a fair one, so counting
> finds nothing again.

Point at the finding and the winning lag.

> The lag predictor names the distance: one. The die is repeating itself. And
> the recommendation changes, because the cause changed.

Then open the biased dataset.

> Here the defect is in the counts, and the advice is to check the die rather
> than the way you roll. The tool distinguishes a bad die from a bad
> procedure, because the fix is different.

## 2:05 to 2:45 — a real die

Open the physical calibration sample.

> These are real rolls, recorded by hand, 256 at a time across three sessions.
> Labelled a physical calibration sample; everything before this was synthetic
> and labelled as such.

Walk the same flow: the figure, the limiting method, what the sessions say
about each other.

Say whatever the data actually says. If the die looks fine, say so. If it looks
biased, say that, and say it is one die.

> _(Placeholder until the sessions are recorded. Until then, run the manual
> capture flow instead: type twenty rolls live, watch two methods decline, and
> show that the tool refuses to produce a confident number from twenty rolls.)_

## 2:45 to 3:15 — what to do about it

Scroll to target guidance and the limitations.

> From the measured rate, this many observations for 128 bits, this many for 256. That follows from a sample of a process that behaved this way once. It
> is not a promise about rolls you have not made.

> And the honest bound: these four methods finding nothing is not proof that
> nothing is there. A result at the ceiling means they found nothing, and that
> is the most any statistical test can say.

## 3:15 to 3:40 — a report someone else can check

Export, download the JSON, open it.

> Process description, every estimator including the ones that declined, the
> limiting method, a SHA-256 of the dataset, the algorithm version, and the
> assumptions and limitations. Enough for someone else to re-derive it. The
> rolls themselves are not in the file unless you ask, because the hash
> identifies the dataset without containing it.

## 3:40 to 4:00 — nothing leaves the machine

Open the browser's network tools, go offline, reload, and run an analysis.

> No account, no backend, no upload. The analysis runs in the page. There is a
> test in the repository asserting that no request ever leaves the origin; the
> fonts are in the repository for the same reason.

## 4:00 to 4:15 — for wallet developers

Show `examples/integrator/src/minimal.ts` on screen. This is the only moment
code appears.

> Twelve lines. Same API the application uses. A wallet can profile a user's
> dice before the seed ceremony without sending anything anywhere.

## Close

> EntropyLab measures the process before you trust it with a seed.

---

## Do not

- Tour every screen. Saved data, profiles and the methodology page do not
  appear.
- Read the methodology aloud. Link it.
- Say certified, validated, guaranteed, or proven random. The tool does not,
  and neither should the narration.
- Claim the physical sample says anything about dice in general. It is one die.

## Pre-flight

- [ ] `pnpm --filter @entropylab/web build && pnpm --filter @entropylab/web preview`
- [ ] Browser zoom at 100%, window at 1280 wide or more
- [ ] Saved data cleared, so the demo starts from a first-run state
- [ ] Downloads folder visible for the export step
- [ ] Physical session files in place, or the 2:05 substitution rehearsed
