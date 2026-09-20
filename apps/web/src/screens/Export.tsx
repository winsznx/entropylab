import { useMemo, useState } from "react";
import { analyze } from "@entropylab/core";
import { buildReport, renderMarkdown } from "@entropylab/report";
import { useStore } from "../state/store.js";
import type { Route } from "../routing.js";

export function Export({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();
  const profile = store.profile;
  const [includeObservations, setIncludeObservations] = useState(false);
  const [saved, setSaved] = useState(false);

  const report = useMemo(() => {
    if (!profile || store.observations.length === 0) return null;
    const sample = { alphabetSize: profile.alphabetSize, observations: store.observations };
    const analysis = analyze(sample);
    const base = buildReport({
      profile: {
        name: profile.name,
        sourceType: profile.sourceType,
        alphabetSize: profile.alphabetSize,
        labels: profile.labels,
        collectionMethod: profile.collectionMethod,
        notes: profile.notes,
      },
      sample,
      analysis,
      datasetSource: store.datasetSource,
      generatedAt: new Date().toISOString(),
    });
    // Raw observations are opt-in. The report identifies its dataset by hash,
    // so it stays verifiable without carrying the rolls themselves, and a
    // report is the thing most likely to be shared.
    return includeObservations
      ? { ...base, observations: store.observations.map((s) => profile.labels[s] ?? s + 1) }
      : base;
  }, [profile, store.observations, store.datasetSource, includeObservations]);

  if (!profile || !report) {
    return (
      <div className="notice notice--info">
        There is no analysis to export yet.{" "}
        <button type="button" className="button button--quiet" onClick={() => navigate("capture")}>
          Record some observations
        </button>
      </div>
    );
  }

  const stem = (profile.name || "entropylab").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  // Built locally and handed to the browser as a blob. Nothing is uploaded and
  // no network request is made at any point in this flow.
  const download = (contents: string, filename: string, type: string): void => {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);

  return (
    <>
      <div className="sheet__title">
        <h1>Export</h1>
        <span className="sheet__note">files are built in this page</span>
      </div>
      <p style={{ marginBottom: 28 }}>
        The report carries the profile, the dataset hash, the algorithm version, every estimator
        result, the limiting one, the target guidance, and the assumptions and limitations behind
        the figure. That is enough for someone else to re-derive it.
      </p>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Download</h2>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button"
            onClick={() => download(json, `${stem}-report.json`, "application/json")}
          >
            Download JSON
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => download(markdown, `${stem}-report.md`, "text/markdown")}
          >
            Download Markdown
          </button>
        </div>

        <div className="field" style={{ marginTop: 24, marginBottom: 0 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={includeObservations}
              style={{ width: "auto", marginTop: 4 }}
              onChange={(e) => setIncludeObservations(e.target.checked)}
            />
            <span>
              Include the raw observations in the file
              <span className="field__hint" style={{ marginTop: 2 }}>
                Off by default. The report identifies its dataset by hash, so it stays verifiable
                without carrying the rolls. Turn this on only if the reader needs to reproduce the
                analysis from scratch, and remember these rolls must never become seed material.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Keep this profile</h2>
          <span className="sheet__note">
            {store.privateSession
              ? "private session, nothing is saved"
              : store.storageAvailable
                ? "saved in this browser only"
                : "storage unavailable in this browser"}
          </span>
        </div>
        <p>
          Saving keeps the profile and this calibration session in this browser so you can compare a
          second session against it later. It never leaves the device.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button button--secondary"
            disabled={store.privateSession || !store.storageAvailable}
            onClick={async () => {
              await store.saveCurrent();
              setSaved(true);
            }}
          >
            Save profile and session
          </button>
          {saved ? <span className="field__hint">Saved.</span> : null}
          {store.privateSession ? (
            <span className="field__hint">
              Private session is on, so nothing is written to this browser.
            </span>
          ) : null}
        </div>
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Report preview</h2>
        </div>
        <div className="tape" style={{ maxHeight: 320 }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{markdown.slice(0, 2400)}</pre>
        </div>
      </section>
    </>
  );
}
