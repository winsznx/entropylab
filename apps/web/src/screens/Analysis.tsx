import { useMemo } from "react";
import { analyzeSession } from "../state/session.js";
import { Provenance } from "../components/Provenance.js";
import { Scale } from "../components/Scale.js";
import { Histogram } from "../components/Histogram.js";
import { EstimatorTable } from "../components/EstimatorTable.js";
import { TransitionMatrix } from "../components/TransitionMatrix.js";
import { Findings, Recommendation, TargetGuidance, Warnings } from "../components/Guidance.js";
import { ZeroState } from "../components/ZeroState.js";
import { useStore } from "../state/store.js";
import type { Route } from "../routing.js";

export function Analysis({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();
  const profile = store.profile;
  const observations = store.observations;

  // One analysis for the session, shared with the report. See
  // state/session.ts for why this is not computed per screen.
  const result = useMemo(
    () => analyzeSession(profile, observations, store.datasetSource),
    [profile, observations, store.datasetSource],
  );

  if (!profile || !result) {
    return (
      <ZeroState
        title="Nothing to analyse yet"
        body="Record some observations and the four methods will run on them here. A demo dataset works too, if you want to see the shape of a result first."
        action={
          <>
            <button type="button" className="btn" onClick={() => navigate("capture")}>
              Record observations
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate("home")}>
              Open a demo dataset
            </button>
          </>
        }
      />
    );
  }

  const { analysis, explanation, sample, provenance } = result;

  return (
    <div className="stack stack--loose">
      <header className="panel__head" style={{ marginBottom: 0 }}>
        <h1>Analysis</h1>
        <span className="panel__note">
          {profile.name} &middot; {analysis.sampleCount} observations
        </span>
      </header>

      <Provenance provenance={provenance} />

      <section className="plate rise">
        <Scale analysis={analysis} />
      </section>

      <section className="editorial">
        <div className="stack">
          <div>
            <div className="section__kicker">What this means</div>
            <Findings explanation={explanation} />
          </div>
        </div>
        <div className="stack">
          <div>
            <div className="section__kicker">What to do</div>
            <Recommendation explanation={explanation} />
          </div>
          <div>
            <div className="section__kicker">Reaching {profile.targetBits} bits</div>
            <TargetGuidance analysis={analysis} targetBits={profile.targetBits} />
          </div>
        </div>
      </section>

      <section>
        <div className="section__kicker">Every method</div>
        <div className="panel panel--flush">
          <EstimatorTable analysis={analysis} />
        </div>
        <p className="t-micro" style={{ marginTop: "var(--space-3)" }}>
          Disagreement is expected when one method detects structure the others cannot see. The
          lowest figure governs; it is never averaged.
        </p>
      </section>

      <section>
        <div className="section__kicker">How the outcomes fell</div>
        <div className="split">
          <div className="panel stack stack--tight">
            <h3>Frequency</h3>
            <Histogram sample={sample} labels={profile.labels} />
          </div>
          <div className="panel stack stack--tight">
            <h3>What followed what</h3>
            <TransitionMatrix analysis={analysis} labels={profile.labels} />
          </div>
        </div>
      </section>

      <section>
        <div className="section__kicker">What to know about this result</div>
        <Warnings analysis={analysis} />
      </section>

      <div className="btn-row">
        <button type="button" className="btn" onClick={() => navigate("export")}>
          Export report
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => navigate("capture")}>
          Record more observations
        </button>
      </div>
    </div>
  );
}
