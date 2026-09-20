import { useEffect, useRef, useState } from "react";
import { detectSecretMaterial, parseObservations, type ParseIssue } from "@entropylab/core";
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
  const tapeRef = useRef<HTMLDivElement>(null);

  const labels = profile?.labels ?? [];
  const observations = store.observations;

  // Keyboard capture. A person reading rolls off a table needs to type without
  // looking at the screen, so the digits are bound at the document level and
  // backspace undoes.
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profile, labels, store]);

  useEffect(() => {
    if (tapeRef.current) tapeRef.current.scrollTop = tapeRef.current.scrollHeight;
  }, [observations.length]);

  // Keyboard capture stops while a text field has focus, which is correct but
  // invisible: someone who clicked into the paste box and kept typing would
  // watch the counter stay at zero with no explanation. The state is tracked
  // so the interface can say which mode it is in.
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
      <div className="notice notice--info">
        Define a process first so the recorded outcomes have an alphabet.{" "}
        <button type="button" className="button button--quiet" onClick={() => navigate("define")}>
          Define a process
        </button>
      </div>
    );
  }

  const ingest = (text: string, source: string): void => {
    const secrets = detectSecretMaterial(text);
    setSecretWarnings(secrets.map((s) => s.message));
    if (secrets.length > 0) {
      // Refuse the import outright rather than parsing it. Whatever this is, it
      // is not a list of dice rolls.
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

  const recent = observations.slice(-120);

  return (
    <>
      <div className="sheet__title">
        <h1>Calibrate</h1>
        <span className="sheet__note">{profile.name}</span>
      </div>
      <p style={{ marginBottom: 28 }}>
        Record the outcomes in the order they happen. Include every roll, even the ones that feel
        wrong, because leaving those out is itself a bias and it will not show up in the numbers.
      </p>

      {secretWarnings.length > 0 ? (
        <div className="notice notice--danger" role="alert">
          {secretWarnings.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      ) : null}

      <section className="sheet">
        <div className="sheet__title">
          <h2>Enter by keyboard</h2>
          <span className="sheet__note">press {labels.join(", ")} · backspace undoes</span>
        </div>

        <div className="keypad">
          {labels.map((label, symbol) => (
            <button
              type="button"
              key={label}
              className="keypad__key"
              onClick={() => store.appendObservation(symbol)}
              aria-label={`Record outcome ${label}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="split" style={{ alignItems: "start" }}>
          <div>
            <div className="counter">{observations.length}</div>
            <div className="field__hint">observations recorded</div>

            {/* Both states occupy the same box, and the button keeps its space
                when hidden. An earlier version rendered the button only while
                paused, so restoring focus changed the height of this block and
                moved every control below it mid-click. */}
            <div className={`capture-state${typingInField ? " capture-state--paused" : ""}`}>
              <span>
                {typingInField
                  ? "Key capture paused while you are typing in a field."
                  : `Key capture is on. Press ${labels.join(", ")} to record, backspace to undo.`}
              </span>
              <button
                type="button"
                className="button button--small"
                style={typingInField ? undefined : { visibility: "hidden" }}
                tabIndex={typingInField ? undefined : -1}
                aria-hidden={typingInField ? undefined : true}
                onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
              >
                Resume key capture
              </button>
            </div>
            <div className="button-row" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="button button--secondary button--small"
                onClick={() => store.undoObservation()}
                disabled={observations.length === 0}
              >
                Undo last
              </button>
              <button
                type="button"
                className="button button--secondary button--small"
                onClick={() => store.clearObservations()}
                disabled={observations.length === 0}
              >
                Clear all
              </button>
            </div>
          </div>
          <div>
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
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Paste or import</h2>
          <span className="sheet__note">stays on this device</span>
        </div>
        <div className="field">
          <label htmlFor="paste">Paste recorded outcomes</label>
          <textarea
            id="paste"
            rows={5}
            value={pasted}
            placeholder={`${labels.slice(0, 4).join(" ")} …  (spaces, commas or new lines; # starts a comment)`}
            onChange={(e) => setPasted(e.target.value)}
          />
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button button--secondary"
            disabled={pasted.trim() === ""}
            onClick={() => ingest(pasted, "pasted text")}
          >
            Read pasted text
          </button>
          <label className="button button--secondary" style={{ cursor: "pointer" }}>
            Import a file
            <input
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              style={{ display: "none" }}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </div>

        {importMessage ? (
          <div className="notice notice--info" style={{ marginTop: 16 }}>
            {importMessage}
          </div>
        ) : null}

        {issues.length > 0 ? (
          <div className="notice notice--warn" style={{ marginTop: 16 }}>
            <strong>{issues.length} value(s) could not be read and were left out.</strong>
            <ul className="warning-list" style={{ marginTop: 8 }}>
              {issues.slice(0, 6).map((issue, i) => (
                <li key={i}>
                  line {issue.line}: {JSON.stringify(issue.token)}
                </li>
              ))}
              {issues.length > 6 ? <li>and {issues.length - 6} more</li> : null}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="button-row">
        <button
          type="button"
          className="button"
          disabled={observations.length === 0}
          onClick={() => navigate("analysis")}
        >
          Analyze {observations.length} observations
        </button>
        {observations.length === 0 ? (
          <span className="field__hint">Record at least one outcome to continue.</span>
        ) : null}
      </div>

      <p className="safety">
        <strong>Never enter a seed phrase or private key here.</strong> This field is for recorded
        dice or coin outcomes. Anything you record should be treated as published, and never reused
        as seed material.
      </p>
    </>
  );
}
