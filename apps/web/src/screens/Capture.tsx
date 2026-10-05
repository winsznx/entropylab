import { useEffect, useRef, useState } from "react";
import { detectSecretMaterial, parseObservations, type ParseIssue } from "@entropylab/core";
import { protocolFor } from "../protocol.js";
import { ProtocolCard } from "../components/ProtocolCard.js";
import { SessionProgress } from "../components/SessionProgress.js";
import { ZeroState } from "../components/ZeroState.js";
import { Icon } from "../components/Icon.js";
import { useStore } from "../state/store.js";
import type { Route } from "../routing.js";

export function Capture({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();
  const profile = store.profile;
  const [pasted, setPasted] = useState("");
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [secretWarnings, setSecretWarnings] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [typingInField, setTypingInField] = useState(false);
  const [pressed, setPressed] = useState<number | null>(null);
  const tapeRef = useRef<HTMLDivElement>(null);

  const labels = profile?.labels ?? [];
  const observations = store.observations;

  // Keyboard capture. Someone reading rolls off a table needs to type without
  // looking at the screen, so the outcome keys are bound at the document
  // level and backspace undoes.
  useEffect(() => {
    if (!profile) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        store.undoObservation();
        return;
      }
      const index = labels.findIndex((label) => label.toLowerCase() === event.key.toLowerCase());
      if (index >= 0) {
        event.preventDefault();
        store.appendObservation(index);
        // Flashes the matching key so a typist gets the same confirmation a
        // click gives, without looking away from the dice.
        setPressed(index);
        window.setTimeout(() => setPressed(null), 120);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profile, labels, store]);

  useEffect(() => {
    if (tapeRef.current) tapeRef.current.scrollTop = tapeRef.current.scrollHeight;
  }, [observations.length]);

  // Key capture stops while a text field has focus, which is correct but
  // invisible: someone who clicked into the paste box and kept typing would
  // watch the count stay still with no explanation.
  useEffect(() => {
    const check = (): void => {
      const active = document.activeElement;
      setTypingInField(!!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName));
    };
    check();
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    return () => {
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
    };
  }, []);

  if (!profile) {
    return (
      <ZeroState
        title="Define the process first"
        body="Recorded outcomes need an alphabet and a procedure to belong to, so that the result says what it applies to."
        action={
          <button type="button" className="btn" onClick={() => navigate("define")}>
            Define a process
          </button>
        }
      />
    );
  }

  const protocol = protocolFor(profile.sourceType);

  const ingest = (text: string, source: string): void => {
    const secrets = detectSecretMaterial(text);
    setSecretWarnings(secrets.map((s) => s.message));
    if (secrets.length > 0) {
      // Refuse outright rather than parsing. Whatever this is, it is not a
      // list of recorded outcomes.
      setIssues([]);
      setImportMessage(null);
      return;
    }
    const result = parseObservations(text, {
      alphabetSize: profile.alphabetSize,
      labels: profile.labels,
    });
    setIssues(result.issues);
    store.setObservations(result.observations, source);
    setImportMessage(
      `Read ${result.observations.length} observations` +
        (result.issues.length > 0 ? `, skipped ${result.issues.length} unreadable` : "") +
        ".",
    );
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    // Read locally. There is no upload path anywhere in this application.
    ingest(await file.text(), `file: ${file.name}`);
  };

  const recent = observations.slice(-150);

  return (
    <div className="stack stack--loose">
      <header>
        <div className="section__kicker">Step two</div>
        <h1>Record the calibration</h1>
        <p className="t-lede reading" style={{ marginTop: "var(--space-3)" }}>
          {profile.name}. Record outcomes in the order they happen, including runs of the same
          result.
        </p>
      </header>

      {secretWarnings.length > 0 ? (
        <div className="notice notice--danger" role="alert">
          {secretWarnings.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      ) : null}

      <section className="editorial">
        <div className="stack">
          <div className="panel stack">
            <SessionProgress
              count={observations.length}
              protocol={protocol}
              sessionIndex={store.sessionIndex}
            />

            <hr className="hair" />

            <div className="capture-state-wrap">
              <div className="keypad">
                {labels.map((label, symbol) => (
                  <button
                    type="button"
                    key={label}
                    className="key"
                    data-pressed={pressed === symbol || undefined}
                    onClick={() => store.appendObservation(symbol)}
                    aria-label={`Record outcome ${label}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Both states occupy the same box and the button keeps its
                  space when hidden, so restoring focus cannot change the
                  height and move the controls below it mid-click. */}
              <div className={`capture-state${typingInField ? " capture-state--paused" : ""}`}>
                <span>
                  {typingInField
                    ? "Key capture paused while you are typing in a field."
                    : `Key capture is on. Press ${labels.join(", ")} to record, backspace to undo.`}
                </span>
                <button
                  type="button"
                  className="btn btn--sm"
                  style={typingInField ? undefined : { visibility: "hidden" }}
                  tabIndex={typingInField ? undefined : -1}
                  aria-hidden={typingInField ? undefined : true}
                  onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
                >
                  Resume key capture
                </button>
              </div>
            </div>

            <div className="btn-row">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => store.undoObservation()}
                disabled={observations.length === 0}
              >
                <Icon name="undo" size={15} />
                Undo last
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => store.clearObservations()}
                disabled={observations.length === 0}
              >
                <Icon name="trash" size={15} />
                Clear session
              </button>
              {protocol.sessions !== null ? (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => store.setSessionIndex(store.sessionIndex + 1)}
                  disabled={store.sessionIndex >= protocol.sessions}
                >
                  Mark session {store.sessionIndex} done
                </button>
              ) : null}
            </div>

            <div>
              <div className="field__label" style={{ marginBottom: "var(--space-2)" }}>
                Sequence as recorded
              </div>
              <div className="tape" ref={tapeRef} aria-live="off">
                {observations.length === 0 ? (
                  <span style={{ opacity: 0.6 }}>Nothing recorded yet.</span>
                ) : (
                  <>
                    {observations.length > recent.length
                      ? `…${observations.length - recent.length} earlier  `
                      : ""}
                    {recent.map((symbol, i) => (
                      <span key={i} className={i >= recent.length - 5 ? "tape__recent" : undefined}>
                        {labels[symbol] ?? symbol + 1}{" "}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="panel stack">
            <div className="panel__head" style={{ marginBottom: 0 }}>
              <h2>Already written down</h2>
              <span className="panel__note">stays on this device</span>
            </div>
            <p className="field__hint" style={{ margin: 0 }}>
              Paste a recorded session or import a file. One outcome per line, or separated by
              spaces or commas. Lines starting with # are treated as notes.
            </p>
            <div className="field">
              <label className="field__label" htmlFor="paste">
                Paste recorded outcomes
              </label>
              <textarea
                className="textarea"
                id="paste"
                rows={4}
                value={pasted}
                placeholder={`${labels.slice(0, 6).join(" ")} …`}
                onChange={(e) => setPasted(e.target.value)}
              />
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--secondary"
                disabled={pasted.trim() === ""}
                onClick={() => ingest(pasted, "pasted text")}
              >
                Read pasted text
              </button>
              <label className="btn btn--secondary" style={{ cursor: "pointer" }}>
                Import a file
                <input
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
              </label>
            </div>

            {importMessage ? <div className="notice notice--info">{importMessage}</div> : null}

            {issues.length > 0 ? (
              <div className="notice notice--warn">
                <strong>{issues.length} value(s) could not be read and were left out.</strong>
                <ul className="list" style={{ marginTop: "var(--space-2)" }}>
                  {issues.slice(0, 6).map((issue, i) => (
                    <li key={i}>
                      line {issue.line}: {JSON.stringify(issue.token)}
                    </li>
                  ))}
                  {issues.length > 6 ? <li>and {issues.length - 6} more</li> : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="stack">
          <div>
            <div className="section__kicker">Protocol</div>
            <ProtocolCard protocol={protocol} compact />
          </div>
          <div className="safety">
            <Icon name="alert" size={18} />
            <span>
              <strong>Calibration observations only.</strong> Never use these rolls as wallet seed
              material, and never type a seed phrase or private key into this page.
            </span>
          </div>
        </div>
      </section>

      <div className="btn-row">
        <button
          type="button"
          className="btn"
          disabled={observations.length === 0}
          onClick={() => navigate("analysis")}
        >
          Analyze {observations.length} observations
        </button>
        {observations.length === 0 ? (
          <span className="field__hint">Record at least one outcome to continue.</span>
        ) : null}
      </div>
    </div>
  );
}
