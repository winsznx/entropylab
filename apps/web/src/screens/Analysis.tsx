import { useMemo } from "react";
import { Scale } from "../components/Scale.js";
import { Contrast } from "../components/Contrast.js";
import { Histogram } from "../components/Histogram.js";
import { EstimatorTable } from "../components/EstimatorTable.js";
import { TransitionMatrix } from "../components/TransitionMatrix.js";
import { Findings, Recommendation, TargetGuidance, Warnings } from "../components/Guidance.js";
import { Provenance } from "../components/Provenance.js";
import { ZeroState } from "../components/ZeroState.js";
import { analyzeSession } from "../state/session.js";
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
      <header>
        <div className="section__kicker">Step three</div>
        <h1>Result</h1>
        <p className="t-lede reading" style={{ marginTop: "var(--space-3)" }}>
          {profile.name} &middot; {analysis.sampleCount} observations
        </p>
      </header>

      <Provenance provenance={provenance} />

      {/* 1. The result, with the action beside it rather than several
          sections below. Someone who reads only this band has the figure,
          the method that produced it, and what to do about it. */}
      <section className="plate rise result">
        <div className="result__reading">
          <Scale analysis={analysis} />
        </div>
        <div className="result__action">
          <div className="section__kicker">What to do</div>
          <Recommendation explanation={explanation} />
        </div>
      </section>

      <Contrast analysis={analysis} />

      <section>
        <div className="section__kicker">Why</div>
        <div className="reading">
          <Findings explanation={explanation} />
        </div>
      </section>

      <section>
        <div className="section__kicker">Evidence</div>
        <div className="split">
          <div className="panel stack stack--tight">
            <h3>How often each outcome fell</h3>
            <Histogram sample={sample} labels={profile.labels} />
          </div>
          <div className="panel stack stack--tight">
            <h3>What followed what</h3>
            <TransitionMatrix analysis={analysis} labels={profile.labels} />
          </div>
        </div>
      </section>

      <section>
        <div className="section__kicker">Methods</div>
        <div className="panel panel--flush">
          <EstimatorTable analysis={analysis} />
        </div>
        <p className="t-micro" style={{ marginTop: "var(--space-3)", maxWidth: "70ch" }}>
          Disagreement is expected when one method detects structure the others cannot see. The
          lowest figure governs; it is never averaged. The methodology column says how much
          authority each result carries, because two of these four are not the published algorithm.
        </p>
      </section>

      <section>
        <div className="section__kicker">Reaching {profile.targetBits} bits</div>
        <div className="reading">
          <TargetGuidance analysis={analysis} targetBits={profile.targetBits} />
        </div>
      </section>

      <section>
        <div className="section__kicker">Limitations</div>
        <div className="reading stack stack--tight">
          <Warnings analysis={analysis} />
          <p className="t-micro">
            Statistical testing can find structure. It cannot establish that none exists. A figure
            at the ceiling means these four methods found nothing, which is the most any of them can
            say. This is not a NIST validation and is not a certification.
          </p>
        </div>
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
