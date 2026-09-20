import { useMemo } from "react";
import { analyze, explain } from "@entropylab/core";
import { Scale } from "../components/Scale.js";
import { Histogram } from "../components/Histogram.js";
import { EstimatorTable } from "../components/EstimatorTable.js";
import { TransitionMatrix } from "../components/TransitionMatrix.js";
import { Findings, Recommendation, TargetGuidance, Warnings } from "../components/Guidance.js";
import { useStore } from "../state/store.js";
import type { Route } from "../routing.js";

export function Analysis({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();
  const profile = store.profile;
  const observations = store.observations;

  const result = useMemo(() => {
    if (!profile || observations.length === 0) return null;
    const sample = { alphabetSize: profile.alphabetSize, observations };
    // The same entry point an integrator calls. There is no separate analysis
    // path for the interface.
    const analysis = analyze(sample, { targetBits: targetsFor(profile.targetBits) });
    return { sample, analysis, explanation: explain(analysis) };
  }, [profile, observations]);

  if (!profile || !result) {
    return (
      <div className="notice notice--info">
        There is nothing to analyze yet.{" "}
        <button type="button" className="button button--quiet" onClick={() => navigate("capture")}>
          Record some observations
        </button>
      </div>
    );
  }

  const { analysis, explanation, sample } = result;

  return (
    <>
      <div className="sheet__title">
        <h1>Analysis</h1>
        <span className="sheet__note">
          {profile.name} · {analysis.sampleCount} observations
        </span>
      </div>

      <section className="sheet">
        <Scale analysis={analysis} />
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>What this means</h2>
        </div>
        <Findings explanation={explanation} />
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>What to do</h2>
        </div>
        <Recommendation explanation={explanation} />
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Every method</h2>
          <span className="sheet__note">disagreement is kept visible</span>
        </div>
        <EstimatorTable analysis={analysis} />
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Reaching your target</h2>
          <span className="sheet__note">{profile.targetBits} bit target</span>
        </div>
        <TargetGuidance analysis={analysis} targetBits={profile.targetBits} />
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>How the outcomes fell</h2>
        </div>
        <div className="split">
          <div>
            <h3 style={{ marginBottom: 16 }}>Frequency</h3>
            <Histogram sample={sample} labels={profile.labels} />
          </div>
          <div>
            <h3 style={{ marginBottom: 16 }}>What followed what</h3>
            <TransitionMatrix analysis={analysis} labels={profile.labels} />
          </div>
        </div>
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>What to know about this result</h2>
        </div>
        <Warnings analysis={analysis} />
      </section>

      <div className="button-row">
        <button type="button" className="button" onClick={() => navigate("export")}>
          Export report
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => navigate("capture")}
        >
          Record more observations
        </button>
      </div>
    </>
  );
}

/** Always shows the standard targets alongside a custom one, for context. */
function targetsFor(target: number): number[] {
  return [...new Set([128, 256, target])].sort((a, b) => a - b);
}
