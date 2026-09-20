# Privacy

EntropyLab is used by people who are about to create a Bitcoin seed and do not
want to be observed doing it. This document states what the application does,
and how each claim was checked.

## What leaves your device

Nothing.

There is no account, no backend, no analytics, no telemetry, no error
reporting, and no upload path. The analysis runs in the page.

## Audit

Performed against the production build, not the source. Every row was verified
rather than asserted; the browser checks are in
[`e2e/product-flows.spec.ts`](../e2e/product-flows.spec.ts) and run in CI.

| Claim                             | How it was checked                                                                                                    | Result                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| No analytics or telemetry         | Searched the built bundle for `gtag`, `analytics`, `telemetry`, `sentry`, `posthog`, `mixpanel`, `segment`, `datadog` | One match, the footer sentence saying there is no telemetry                              |
| No third-party scripts            | Inspected every `<script>` and external URL in the build                                                              | Only the application's own bundle                                                        |
| No external fonts                 | Searched the build for font CDN hosts                                                                                 | None. Fonts are committed to this repository and served from the bundle                  |
| No remote APIs                    | Searched the build for `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, dynamic `import()`                 | None present                                                                             |
| No request leaves the origin      | Browser test recording every request during load, analysis and export                                                 | Zero off-origin requests                                                                 |
| No calibration upload             | Same test, plus review of the only two `fetch` call sites                                                             | Both same-origin and structural: Vite's module preload and the service worker's precache |
| Works with the network off        | Browser test: register the service worker, disable the network, reload, run a full analysis                           | Passes                                                                                   |
| Private session writes nothing    | Browser test reading IndexedDB directly after a full run                                                              | Zero profiles, zero sessions                                                             |
| No observation reaches the URL    | Browser test comparing the address bar after recording rolls                                                          | URL is `#/analysis` and nothing else                                                     |
| Downloads are user-initiated      | Browser test counting download events across the export screen                                                        | Zero until the button is pressed                                                         |
| No field asks for secret material | Browser test reading every input placeholder, label and id on all seven screens                                       | No field mentions a mnemonic, seed phrase, private key, xprv or passphrase               |

Two external links exist, both on the "How it was tested" screen and both
labelled as reaching the internet: the methodology document and the test
campaign, on GitHub. They are followed only if you click them.

## Storage

Profiles and calibration sessions are written to IndexedDB on the device. They
are not synced, not backed up, and not readable by any other site. Clearing
browser data removes them, and "Delete all saved data" on the Saved data screen
removes them immediately.

The **private session** switch blocks every write for the visit. It is enforced
at the single function that writes, rather than at each call site, so a new
screen cannot bypass it by accident.

If the browser refuses storage, which happens in private windows and when site
data is blocked, the application keeps working and simply does not remember
anything. That state is expected rather than exceptional for this audience.

## Reports

Reports are built in the page and handed to the browser as a download. No
report is transmitted.

A report contains the process description you typed, the estimator results, and
a SHA-256 of the dataset. It does **not** contain the observations themselves
unless you tick the box that includes them. The hash identifies a dataset
without containing it, so a report stays verifiable while staying quiet.

## What EntropyLab never asks for

The application has no field for a mnemonic, seed phrase, private key,
extended key, or wallet backup, and no workflow that would use one.

Pasted text is checked before it is read, and input that looks like seed
material is refused rather than parsed. That check looks for runs of words,
extended-key prefixes, WIF keys and 64-character hex strings. It is a guardrail
against the realistic accident, which is pasting a recovery sheet into the
wrong box. It is not a secret detector and cannot catch every encoding. The
warning it shows never repeats the matched text back onto the screen.

## What this does not protect against

Local-only is not the same as safe. EntropyLab does nothing about:

- a compromised operating system, browser, or extension
- someone watching the screen, the room, or the dice
- the device itself being seized or inspected later
- observations you export and then handle carelessly

And a point that is easy to miss: **calibration observations must never become
seed material.** They have been recorded, analysed, possibly exported, and
possibly committed to a repository. Roll a fresh, unrecorded sequence for an
actual ceremony.
