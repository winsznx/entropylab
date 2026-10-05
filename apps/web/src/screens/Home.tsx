import { useMemo } from "react";
import { analyze } from "@entropylab/core";
import { allFixtures, periodicBalanced } from "@entropylab/fixtures";
import { Scale } from "../components/Scale.js";
import { Icon } from "../components/Icon.js";
import { useStore, makeProfile } from "../state/store.js";
import type { Route } from "../routing.js";

/** What each method reads, and what it cannot see. */
const METHODS = [
  {
    name: "Most common value",
    icon: "dice" as const,
    sees: "How often the commonest outcome turns up.",
    blind: "Blind to order. Cannot distinguish a shuffled sequence from a sorted one.",
  },
  {
    name: "Collision",
    icon: "wave" as const,
    sees: "How quickly outcomes start repeating, measured over a binary encoding.",
    blind: "Carries the encoding's own structure for a six-sided alphabet.",
  },
  {
    name: "Markov",
    icon: "arrow" as const,
    sees: "Whether the next outcome depends on the current one.",
    blind: "First order only. Dependence spanning more than one step is invisible.",
  },
  {
    name: "Lag predictor",
    icon: "scale" as const,
    sees: "Whether any outcome repeats at a fixed distance back.",
    blind: "Cannot see a period longer than 128.",
  },
];

export function Home({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();

  // Computed in the page on load. The opening claim is not something the
  // reader has to take on trust; it is the tool running on a dataset they can
  // open with one click.
  const demonstration = useMemo(() => analyze(periodicBalanced()), []);
  const frequencyOnly = demonstration.estimators.find((e) => e.id === "most-common-value");
  const frequencyBits = frequencyOnly?.bitsPerSymbol ?? 0;

  const fixtures = useMemo(() => allFixtures(), []);
  const fixtureReadings = useMemo(
    () => new Map(fixtures.map((f) => [f.id, analyze(f.sample)] as const)),
    [fixtures],
  );

  const openFixture = (fixtureId: string): void => {
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (!fixture) return;
    store.setProfile(
      makeProfile({
        name: `${fixture.label} (demo)`,
        collectionMethod: `Synthetic adversarial fixture ${fixture.id}, generated, not rolled`,
        notes: fixture.defect,
      }),
    );
    store.setObservations(fixture.sample.observations, `demo fixture ${fixture.id}`);
    navigate("analysis");
  };

  return (
    <>
      <section className="hero">
        <div className="hero__inner">
          <div className="rise">
            <h1>Measure the process before it holds your seed.</h1>
            <p className="hero__lede">
              Counting rolls assumes every roll is worth a full share of entropy. EntropyLab checks
              whether that is true for the dice and the hands in front of you, offline, before a
              seed exists.
            </p>
            <div className="hero__actions">
              <button type="button" className="btn" onClick={() => navigate("define")}>
                Start a calibration
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => openFixture("PERIODIC_BALANCED")}
              >
                Open the dataset below
              </button>
            </div>
          </div>

          <div className="hero__instrument rise rise-2">
            <Scale
              analysis={demonstration}
              caption="One method reads the counts and finds nothing wrong. Another reads the order. The lowest governs."
            />
            <p className="hero__caption">
              1,2,3,4,5,6 repeating &middot; 6000 observations &middot; computed in this page
            </p>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="strip">
          <div className="strip__cell">
            <span className="strip__figure">{frequencyBits.toFixed(4)}</span>
            <span className="strip__label">Frequency analysis</span>
            <span className="strip__note">
              Out of a possible 2.5850. By the usual check, a healthy source.
            </span>
          </div>
          <div className="strip__cell">
            <span className="strip__figure strip__figure--structure">0.0000</span>
            <span className="strip__label">Once order is considered</span>
            <span className="strip__note">
              The sequence is 1,2,3,4,5,6 repeating. The next roll is never in doubt.
            </span>
          </div>
          <div className="strip__cell">
            <span className="strip__figure">{frequencyBits.toFixed(2)}</span>
            <span className="strip__label">Bits the usual check would have claimed</span>
            <span className="strip__note">Per roll, on a source that carries none of them.</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__kicker">The problem</div>
        <div className="editorial">
          <h2
            style={{
              fontSize: "var(--text-h1-size)",
              lineHeight: "var(--text-h1-leading)",
              letterSpacing: "var(--text-h1-tracking)",
            }}
          >
            A balanced histogram is not the same as an unpredictable one.
          </h2>
          <div className="stack">
            <p className="t-lede">
              Self-custody guides tell people to roll dice, then stop there. The check almost
              everyone applies is counting: 99 rolls of a six-sided die, about 2.585 bits each, call
              it 256 bits.
            </p>
            <p className="muted" style={{ fontSize: "var(--text-body-s-size)" }}>
              That arithmetic assumes the die is fair and the roller has no habits. A weighted die
              fails it. So does a die that does not tumble, a hand that favours a release, and any
              process with a pattern in it. None of those show up in a count, and some of them do
              not show up in a histogram either.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__kicker">How it works</div>
        <div className="editorial editorial--sticky">
          <div className="steps">
            <div className="step">
              <span className="step__index">01</span>
              <div className="step__body">
                <span className="step__title">Describe the process</span>
                <span className="step__detail">
                  The source, the alphabet, how you collect. It travels with the report so a reader
                  months from now knows which die produced the result.
                </span>
              </div>
            </div>
            <div className="step">
              <span className="step__index">02</span>
              <div className="step__body">
                <span className="step__title">Record the outcomes</span>
                <span className="step__detail">
                  Type them as you roll, or paste a session you already wrote down. Order matters:
                  every sequential method depends on it.
                </span>
              </div>
            </div>
            <div className="step">
              <span className="step__index">03</span>
              <div className="step__body">
                <span className="step__title">Read what limits you</span>
                <span className="step__detail">
                  Four methods run. The lowest governs, the product names it, and tells you whether
                  to roll more, change how you roll, or check the die.
                </span>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="methods">
              {METHODS.map((method) => (
                <div className="method" key={method.name}>
                  <span className="method__name">
                    <Icon name={method.icon} size={16} />
                    {method.name}
                  </span>
                  <span className="method__sees">{method.sees}</span>
                  <span className="method__blind">{method.blind}</span>
                </div>
              ))}
            </div>
            <p className="t-micro">
              No method sees everything, which is why the lowest figure governs rather than an
              average. One method finding structure is enough; four finding none is not proof there
              is none.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__kicker">Failure modes</div>
        <div className="stack">
          <div className="editorial">
            <h2>Five sources with known defects.</h2>
            <p className="muted" style={{ fontSize: "var(--text-body-s-size)" }}>
              Synthetic adversarial fixtures, generated from a seeded source with a defect
              deliberately injected. None has touched a die. They exist to test the methods against
              answers known in advance, and each one opens in the normal analysis screen.
            </p>
          </div>

          <div className="datasets">
            {fixtures.map((fixture) => {
              const reading = fixtureReadings.get(fixture.id);
              const bits = reading?.conservativeBitsPerSymbol;
              return (
                <button
                  type="button"
                  className="dataset"
                  key={fixture.id}
                  onClick={() => openFixture(fixture.id)}
                >
                  <span className="dataset__name">{fixture.label}</span>
                  <span className="dataset__defect">{fixture.defect}</span>
                  <span
                    className={`dataset__figure${bits !== undefined && bits < 0.6 ? " dataset__figure--structure" : ""}`}
                  >
                    {bits === undefined ? "no reading" : `${bits.toFixed(4)} bits`}
                  </span>
                  <span className="dataset__go">
                    <Icon name="arrow" size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__kicker">What it rests on</div>
        <div className="facts">
          <div className="fact">
            <span className="fact__title">Checked against the reference</span>
            <span className="fact__body">
              Every comparable estimator agrees with the NIST SP 800-90B reference implementation to
              ten decimal places, using a binary built from NIST&apos;s own C++.
            </span>
          </div>
          <div className="fact">
            <span className="fact__title">Nothing leaves the device</span>
            <span className="fact__body">
              No account, no backend, no telemetry. A browser test asserts that no request ever
              leaves the origin, which is why the fonts ship with the app.
            </span>
          </div>
          <div className="fact">
            <span className="fact__title">Reports others can re-derive</span>
            <span className="fact__body">
              Each report carries a SHA-256 of the dataset and the algorithm version, without
              carrying the rolls themselves unless you ask.
            </span>
          </div>
          <div className="fact">
            <span className="fact__title">Not a certification</span>
            <span className="fact__body">
              The standard assumes around a million samples; a dice ceremony produces hundreds. This
              measures evidence of bias and predictability, and claims nothing more.
            </span>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="closing">
          <h2>Measure the process before you trust it with a seed.</h2>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <button type="button" className="btn" onClick={() => navigate("define")}>
              Start a calibration
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate("about")}>
              How it was tested
            </button>
          </div>
          <p
            style={{
              fontSize: "var(--text-micro-size)",
              color: "rgba(233,237,243,0.6)",
              maxWidth: "52ch",
            }}
          >
            Use calibration observations only. Never enter a seed phrase, mnemonic, or private key.
            Rolls recorded here should never be reused as seed material.
          </p>
        </div>
      </section>
    </>
  );
}
