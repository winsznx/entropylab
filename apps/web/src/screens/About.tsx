import { AUTHORITY_LABEL, METHOD_NOTES } from "../methods.js";

const REPO = "https://github.com/winsznx/entropylab";

const ORDER = ["most-common-value", "collision", "markov", "lag-predictor"] as const;
const NAMES: Record<string, string> = {
  "most-common-value": "Most common value",
  collision: "Collision",
  markov: "Markov",
  "lag-predictor": "Lag predictor",
};

/**
 * The credibility argument, short enough to read before trusting a figure.
 *
 * This is not the methodology document. It answers what a judge or a careful
 * user needs in two minutes: what is measured, which parts come from NIST,
 * which parts this project changed, how the implementation was checked, and
 * what the checking does not establish. The full treatment stays in the
 * repository and is linked rather than pasted.
 */
export function About(): JSX.Element {
  return (
    <div className="stack stack--loose">
      <header>
        <div className="section__kicker">Methods and evidence</div>
        <h1>What EntropyLab measures, and what it does not establish.</h1>
        <p className="t-lede reading" style={{ marginTop: "var(--space-3)" }}>
          The estimators are the part of this tool that could be quietly wrong, so they are checked
          against published algorithms, against datasets whose defects are known in advance, and
          against the reference implementation of the standard they come from.
        </p>
      </header>

      <section className="editorial editorial--sticky">
        <h2>What is measured</h2>
        <div className="stack">
          <p className="muted">
            A min-entropy lower bound, in bits per observation, for the process that produced a
            recorded sample. Four methods run over the same data and the lowest figure governs.
          </p>
          <p className="muted">
            The methods are not nested. Frequency concentration, collision behaviour, first-order
            transitions and fixed-offset repetition are different attacks on a source, and a source
            is only as strong as the best attack against it. That is why the result is a minimum
            rather than an average, and why a method finding nothing is not evidence that nothing is
            there.
          </p>
        </div>
      </section>

      <section>
        <div className="section__kicker">How much authority each method carries</div>
        <div className="panel panel--flush">
          <table className="table methods-table">
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Methodology</th>
                <th scope="col">What that means</th>
              </tr>
            </thead>
            <tbody>
              {ORDER.map((id) => {
                const note = METHOD_NOTES[id];
                if (!note) return null;
                return (
                  <tr key={id}>
                    <th scope="row">{NAMES[id]}</th>
                    <td>
                      <span className={`chip chip--authority-${note.authority}`}>
                        {AUTHORITY_LABEL[note.authority]}
                      </span>
                    </td>
                    <td className="muted">{note.caveat}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="editorial editorial--sticky">
        <h2>How the implementation was checked</h2>
        <div className="stack">
          <p className="muted">
            Every comparable estimator agrees with the NIST SP 800-90B reference implementation to
            ten decimal places, on all five test datasets. The comparison binary is built by lifting
            the estimator functions out of NIST&apos;s own C++ rather than reimplementing them, so a
            disagreement would be a disagreement with their arithmetic.
          </p>
          <p className="muted">
            The Markov estimate is excluded from that comparison, because the reference computes a
            different quantity. Forcing the two to agree would mean changing one of them into
            something other than what it claims to be.
          </p>
          <div className="facts">
            <div className="fact">
              <span className="fact__title">What the agreement establishes</span>
              <span className="fact__body">
                That these implementations compute what they claim to compute.
              </span>
            </div>
            <div className="fact">
              <span className="fact__title">What it does not</span>
              <span className="fact__body">
                That the estimates are correct for a physical source, that any source is random, or
                that anything here is validated. It checks arithmetic against a reference, on
                generated data, at sample sizes far below what either implementation was designed
                around.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="editorial editorial--sticky">
        <h2>Why a few hundred rolls is not a certification</h2>
        <div className="stack">
          <p className="muted">
            SP 800-90B&apos;s assessment process assumes at least a million samples from a
            documented noise source. A dice calibration produces hundreds, from a process a person
            operates and can change between sessions.
          </p>
          <ul className="list">
            <li>
              The confidence bounds do most of the work at these sizes. A perfectly balanced
              6000-roll d6 reports 2.481 against a 2.585 ideal, and that gap is the bound rather
              than a defect in the die.
            </li>
            <li>
              A calibration describes what happened, not what will happen. A human-operated process
              drifts with attention, grip, surface and fatigue.
            </li>
            <li>
              Finding no structure is not evidence of its absence. These four methods do not exhaust
              the ways a process can be predictable.
            </li>
          </ul>
          <p className="muted">
            What EntropyLab can honestly claim is that it measures evidence of bias and
            predictability in a calibration sample, reports which method limits the estimate, and
            states what the figure rests on. It is not a NIST validation and confers no
            certification.
          </p>
        </div>
      </section>

      <section>
        <div className="section__kicker">Read further</div>
        <div className="btn-row">
          <a
            className="btn btn--secondary"
            href={`${REPO}/blob/main/docs/METHODOLOGY.md`}
            target="_blank"
            rel="noreferrer"
          >
            Full methodology
          </a>
          <a
            className="btn btn--secondary"
            href={`${REPO}/tree/main/docs/proof-campaign`}
            target="_blank"
            rel="noreferrer"
          >
            Test campaign
          </a>
          <a
            className="btn btn--secondary"
            href={`${REPO}/blob/main/docs/CAMPAIGN-F-PROTOCOL.md`}
            target="_blank"
            rel="noreferrer"
          >
            Physical protocol
          </a>
          <a
            className="btn btn--secondary"
            href={`${REPO}/blob/main/docs/PRIVACY.md`}
            target="_blank"
            rel="noreferrer"
          >
            Privacy audit
          </a>
        </div>
        <p className="t-micro" style={{ marginTop: "var(--space-3)" }}>
          These four links reach the internet. Everything else in EntropyLab works with networking
          off.
        </p>
      </section>
    </div>
  );
}
