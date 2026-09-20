export function About(): JSX.Element {
  return (
    <>
      <div className="sheet__title">
        <h1>How EntropyLab was tested</h1>
      </div>
      <p style={{ marginBottom: 28 }}>
        The estimators are the part of this tool that could be quietly wrong, so they are checked
        against published algorithms, against datasets with known defects, and against the reference
        implementation of the standard they come from.
      </p>

      <section className="sheet">
        <div className="sheet__title">
          <h2>What the methods are</h2>
        </div>
        <p>
          Four estimators run on every sample. Two are taken directly from NIST SP 800-90B and run
          on dice outcomes as published. One is adapted, and one is a generalisation of a method the
          standard restricts to binary data.
        </p>
        <p>
          Which is which matters, and the methodology document separates them rather than presenting
          them in one voice.
        </p>
        <ul className="warning-list">
          <li>
            <strong>Most common value</strong> and <strong>lag predictor</strong>: used directly,
            and they agree with the NIST reference implementation to ten decimal places on every
            test dataset.
          </li>
          <li>
            <strong>Collision</strong>: adapted. It requires binary input, so dice are encoded to
            three bits first, and that encoding leaves its own mark on the result.
          </li>
          <li>
            <strong>Markov</strong>: a generalisation to six outcomes, following the structure of a
            2016 draft of the standard. It is not the published method and is not compared against
            the reference, because the two compute different things.
          </li>
        </ul>
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>What this is not</h2>
        </div>
        <p>
          EntropyLab is not a NIST validation and gives no certification. The standard it draws on
          assumes at least a million samples and a documented description of the source; a dice
          calibration produces a few hundred rolls.
        </p>
        <p>
          Statistical testing can find structure. It cannot establish that none exists. A result at
          the top of the scale means these four methods found nothing, which is the most they can
          ever say.
        </p>
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Read further</h2>
        </div>
        <p>
          The full methodology, the fixture definitions, the reference comparison and the
          limitations are in the repository.
        </p>
        <div className="button-row">
          <a
            className="button button--secondary"
            href="https://github.com/winsznx/entropylab/blob/main/docs/METHODOLOGY.md"
            target="_blank"
            rel="noreferrer"
          >
            Methodology
          </a>
          <a
            className="button button--secondary"
            href="https://github.com/winsznx/entropylab/tree/main/docs/proof-campaign"
            target="_blank"
            rel="noreferrer"
          >
            Test campaign
          </a>
        </div>
        <p className="field__hint" style={{ marginTop: 16 }}>
          These links reach the internet. Everything else in EntropyLab works with networking off.
        </p>
      </section>
    </>
  );
}
