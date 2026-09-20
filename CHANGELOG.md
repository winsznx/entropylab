# Changelog

## Unreleased

### Added

- Core data model, sample validation, and the estimator interface.
- Most-common-value estimator (SP 800-90B 6.3.1).
- Collision estimator (SP 800-90B 6.3.2), with documented binarisation for non-binary alphabets.
- Markov estimator, generalised to k symbols following the structure of the 2016 second draft.
- Lag predictor (SP 800-90B 6.3.8) and the shared predictor-conversion framework.
- Conservative combination, limiting-estimator reporting, and target guidance.
- Canonical JSON reports with a dataset hash, and Markdown rendering generated from them.
- Five adversarial fixtures with deterministic generation and asserted properties.
- Proof campaign generated from code, under `docs/proof-campaign`.
- Reference comparison against the NIST SP 800-90B reference implementation.
- Methodology and architecture documentation.
- CI running formatting, typecheck, tests, and a check that `internal/` stays untracked.

- Explanation layer turning an analysis into named findings and one recommended next step.
- Observation parser and seed-material guardrails.
- Offline-first web application: define, calibrate, analyze, understand, decide, export.
- Local persistence in IndexedDB, with a private session that writes nothing.
- Physical dice import pipeline and session protocol, awaiting real recordings.
- Benchmarks generated from code.
- Methodology boundaries separating published algorithms, adaptations, and this project's own thresholds.
- End-to-end browser tests including offline operation and an assertion that no request leaves the origin.

### Notes

- Repository initialized for BOSS Battle 2026.
