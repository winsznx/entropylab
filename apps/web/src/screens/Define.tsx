import { useState } from "react";
import { useStore, makeProfile, type ProfileDraft } from "../state/store.js";
import type { Route } from "../routing.js";

const PRESETS = [
  {
    id: "d6" as const,
    label: "Six-sided die",
    alphabetSize: 6,
    labels: ["1", "2", "3", "4", "5", "6"],
  },
  { id: "coin" as const, label: "Coin", alphabetSize: 2, labels: ["H", "T"] },
  { id: "custom" as const, label: "Custom", alphabetSize: 20, labels: [] },
];

export function Define({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();
  const [draft, setDraft] = useState<ProfileDraft>(() => store.profile ?? makeProfile());
  const [customTarget, setCustomTarget] = useState(false);

  const update = (patch: Partial<ProfileDraft>): void => setDraft((d) => ({ ...d, ...patch }));

  const choosePreset = (preset: (typeof PRESETS)[number]): void => {
    update({
      sourceType: preset.id,
      alphabetSize: preset.alphabetSize,
      labels:
        preset.labels.length > 0
          ? preset.labels
          : Array.from({ length: preset.alphabetSize }, (_, i) => String(i + 1)),
    });
  };

  const setAlphabetSize = (size: number): void => {
    const clamped = Math.max(2, Math.min(64, Number.isFinite(size) ? size : 2));
    update({
      alphabetSize: clamped,
      labels: Array.from({ length: clamped }, (_, i) => draft.labels[i] ?? String(i + 1)),
    });
  };

  const canContinue = draft.name.trim().length > 0 && draft.alphabetSize >= 2;

  return (
    <>
      <div className="sheet__title">
        <h1>Define the process</h1>
      </div>
      <p style={{ marginBottom: 28 }}>
        Describe the source you are about to calibrate. What you record here travels with the
        report, so a reader months from now can tell which die and which method produced the result.
      </p>

      <section className="sheet">
        <div className="field">
          <label htmlFor="profile-name">Name</label>
          <input
            id="profile-name"
            type="text"
            value={draft.name}
            placeholder="White acrylic d6, felt mat"
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>

        <div className="field">
          <span className="visually-hidden" id="source-label">
            Source type
          </span>
          <label aria-hidden="true">Source</label>
          <div className="choice-row" role="group" aria-labelledby="source-label">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className="choice"
                aria-pressed={draft.sourceType === preset.id}
                onClick={() => choosePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {draft.sourceType === "custom" ? (
          <div className="field">
            <label htmlFor="alphabet-size">How many possible outcomes</label>
            <input
              id="alphabet-size"
              type="number"
              min={2}
              max={64}
              value={draft.alphabetSize}
              onChange={(e) => setAlphabetSize(Number(e.target.value))}
            />
            <div className="field__hint">
              Outcomes are recorded as 1 to {draft.alphabetSize}. An ideal source of this size
              carries {Math.log2(draft.alphabetSize).toFixed(4)} bits per observation.
            </div>
          </div>
        ) : (
          <div className="field">
            <div className="field__hint">
              Outcomes recorded as {draft.labels.join(", ")}. An ideal source of this size carries{" "}
              {Math.log2(draft.alphabetSize).toFixed(4)} bits per observation.
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="collection">How you collect</label>
          <input
            id="collection"
            type="text"
            value={draft.collectionMethod}
            placeholder="Shaken in a cup, dropped from about 20cm"
            onChange={(e) => update({ collectionMethod: e.target.value })}
          />
          <div className="field__hint">
            Keep this the same between calibration and the real ceremony. Changing the method
            invalidates the measurement.
          </div>
        </div>

        <div className="field">
          <span className="visually-hidden" id="target-label">
            Entropy target
          </span>
          <label aria-hidden="true">Entropy target</label>
          <div className="choice-row" role="group" aria-labelledby="target-label">
            {[128, 256].map((bits) => (
              <button
                type="button"
                key={bits}
                className="choice"
                aria-pressed={!customTarget && draft.targetBits === bits}
                onClick={() => {
                  setCustomTarget(false);
                  update({ targetBits: bits });
                }}
              >
                {bits} bits
              </button>
            ))}
            <button
              type="button"
              className="choice"
              aria-pressed={customTarget}
              onClick={() => setCustomTarget(true)}
            >
              Custom
            </button>
          </div>
          {customTarget ? (
            <input
              type="number"
              min={1}
              max={4096}
              value={draft.targetBits}
              aria-label="Custom entropy target in bits"
              style={{ marginTop: 12 }}
              onChange={(e) => update({ targetBits: Math.max(1, Number(e.target.value) || 1) })}
            />
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            rows={3}
            value={draft.notes}
            placeholder="Anything that might matter later: the surface, the room, who rolled."
            onChange={(e) => update({ notes: e.target.value })}
          />
        </div>
      </section>

      <div className="button-row">
        <button
          type="button"
          className="button"
          disabled={!canContinue}
          onClick={() => {
            store.setProfile(draft);
            navigate("capture");
          }}
        >
          Continue to calibration
        </button>
        {!canContinue ? (
          <span className="field__hint">Give the profile a name to continue.</span>
        ) : null}
      </div>
    </>
  );
}
