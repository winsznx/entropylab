import { useMemo } from "react";
import { analyze } from "@entropylab/core";
import { allFixtures, periodicBalanced } from "@entropylab/fixtures";
import { Scale } from "../components/Scale.js";
import { useStore, makeProfile } from "../state/store.js";
import type { Route } from "../routing.js";

export function Home({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();

  // Computed in the page on load. The opening claim is not an assertion the
  // reader has to take on trust; it is the tool running on a dataset they can
  // open in the next click.
  const demonstration = useMemo(() => analyze(periodicBalanced()), []);
  const frequencyOnly = demonstration.estimators.find((e) => e.id === "most-common-value");

  const startDemo = (fixtureId: string): void => {
    const fixture = allFixtures().find((f) => f.id === fixtureId);
    if (!fixture) return;
    store.setProfile(
      makeProfile({
        name: `${fixture.label} (demo)`,
        sourceType: "d6",
        collectionMethod: `Demo dataset ${fixture.id}, generated, not rolled`,
        notes: fixture.defect,
      }),
    );
    store.setObservations(fixture.sample.observations, `demo fixture ${fixture.id}`);
    navigate("analysis");
  };

  return (
    <>
      <section className="sheet--quiet" style={{ marginBottom: 32 }}>
        <h1>Measure the process before it holds your seed.</h1>
        <p className="hero__lede">
          Counting rolls assumes every roll is worth a full share of entropy. EntropyLab checks
          whether that is true for the dice and the hands in front of you, offline, before a seed
          exists.
        </p>
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>A sequence with a perfect histogram</h2>
          <span className="sheet__note">computed in this page, just now</span>
        </div>
        <p>
          Every outcome below appears exactly as often as it should. Frequency analysis rates it{" "}
          <strong>{frequencyOnly?.bitsPerSymbol?.toFixed(4)}</strong> bits per roll, close to the
          2.5850 ceiling for six faces. It is the sequence 1, 2, 3, 4, 5, 6 repeating, so the next
          roll is never in doubt.
        </p>
        <Scale
          analysis={demonstration}
          caption="One method reads the counts and finds nothing wrong. Another reads the order. The lower figure governs, and here it is the whole answer."
        />
        <div className="button-row" style={{ marginTop: 28 }}>
          <button type="button" className="button" onClick={() => navigate("define")}>
            Start a calibration
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => startDemo("PERIODIC_BALANCED")}
          >
            Open this dataset
          </button>
        </div>
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Demo datasets</h2>
          <span className="sheet__note">generated, not rolled</span>
        </div>
        <p>
          Five datasets with known defects, used to test the estimators. Each opens in the normal
          analysis screen.
        </p>
        <div className="demo-grid">
          {allFixtures().map((fixture) => (
            <button
              type="button"
              className="demo"
              key={fixture.id}
              onClick={() => startDemo(fixture.id)}
            >
              <div className="demo__name">{fixture.label}</div>
              <p className="demo__defect">{fixture.defect}</p>
            </button>
          ))}
        </div>
      </section>

      {store.savedProfiles.length > 0 ? (
        <section className="sheet">
          <div className="sheet__title">
            <h2>Saved profiles</h2>
            <span className="sheet__note">stored in this browser only</span>
          </div>
          <div className="saved-list">
            {store.savedProfiles.slice(0, 4).map((profile) => (
              <div className="saved" key={profile.id}>
                <span className="saved__name">{profile.name || "Untitled"}</span>
                <span className="saved__meta">
                  {profile.alphabetSize} outcomes, {profile.targetBits} bit target
                </span>
                <span className="saved__actions">
                  <button
                    type="button"
                    className="button button--secondary button--small"
                    onClick={async () => {
                      await store.loadProfile(profile.id);
                      navigate("capture");
                    }}
                  >
                    Open
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => navigate("profiles")}
            >
              Manage saved data
            </button>
          </div>
        </section>
      ) : null}

      <p className="safety">
        <strong>Use calibration observations only.</strong> Never type or paste a seed phrase,
        mnemonic, private key, or wallet backup into this tool. It never needs one, and rolls you
        record here should not be reused as seed material.
      </p>
    </>
  );
}
