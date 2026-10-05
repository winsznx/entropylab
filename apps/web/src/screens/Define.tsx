import { useState } from "react";
import { protocolFor } from "../protocol.js";
import { ProtocolCard } from "../components/ProtocolCard.js";
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
  { id: "custom" as const, label: "Custom source", alphabetSize: 20, labels: [] },
];

/** What a target is for, rather than what it is. */
const TARGET_MEANING: Record<number, string> = {
  128: "A 12-word seed. The usual choice, and enough for almost every threat model.",
  256: "A 24-word seed. Choose this if you want the larger margin.",
};

export function Define({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();
  const [draft, setDraft] = useState<ProfileDraft>(() => store.profile ?? makeProfile());
  const [customTarget, setCustomTarget] = useState(
    () => ![128, 256].includes(store.profile?.targetBits ?? 128),
  );

  const update = (patch: Partial<ProfileDraft>): void => setDraft((d) => ({ ...d, ...patch }));
  const protocol = protocolFor(draft.sourceType);

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
  const ideal = Math.log2(draft.alphabetSize);

  return (
    <div className="stack stack--loose">
      <header>
        <div className="section__kicker">Step one</div>
        <h1>Define the process</h1>
        <p className="t-lede reading" style={{ marginTop: "var(--space-3)" }}>
          A calibration measures one procedure. What you describe here is what the result applies
          to, and it travels with the report so a reader later knows which die produced it.
        </p>
      </header>

      <section className="editorial">
        <div className="stack">
          <div className="panel stack">
            <div className="field">
              <label className="field__label" htmlFor="profile-name">
                What are you calibrating
              </label>
              <input
                className="input"
                id="profile-name"
                type="text"
                value={draft.name}
                placeholder="White acrylic d6, felt mat"
                onChange={(e) => update({ name: e.target.value })}
              />
              <span className="field__hint">
                Specific enough to tell two dice apart months from now.
              </span>
            </div>

            <div className="field">
              <span className="field__label" id="source-label">
                Source
              </span>
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
              <span className="field__hint">
                {draft.sourceType === "custom"
                  ? `Outcomes recorded as 1 to ${draft.alphabetSize}.`
                  : `Outcomes recorded as ${draft.labels.join(", ")}.`}{" "}
                A perfect source of this size carries {ideal.toFixed(4)} bits per observation, which
                is the ceiling every estimate is read against.
              </span>
            </div>

            {draft.sourceType === "custom" ? (
              <div className="field">
                <label className="field__label" htmlFor="alphabet-size">
                  How many possible outcomes
                </label>
                <input
                  className="input"
                  id="alphabet-size"
                  type="number"
                  min={2}
                  max={64}
                  value={draft.alphabetSize}
                  onChange={(e) => setAlphabetSize(Number(e.target.value))}
                />
              </div>
            ) : null}

            <div className="field">
              <label className="field__label" htmlFor="collection">
                How you collect
              </label>
              <input
                className="input"
                id="collection"
                type="text"
                value={draft.collectionMethod}
                placeholder="Shaken in a cup, dropped from about 20cm onto felt"
                onChange={(e) => update({ collectionMethod: e.target.value })}
              />
              <span className="field__hint">
                Calibration is only meaningful if the physical procedure stays the same. What you
                write here should be the process you intend to use for the ceremony itself.
              </span>
            </div>

            <div className="field">
              <span className="field__label" id="target-label">
                What this seed is for
              </span>
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
                  className="input"
                  type="number"
                  min={1}
                  max={4096}
                  value={draft.targetBits}
                  aria-label="Custom entropy target in bits"
                  style={{ marginTop: "var(--space-3)" }}
                  onChange={(e) => update({ targetBits: Math.max(1, Number(e.target.value) || 1) })}
                />
              ) : null}
              <span className="field__hint">
                {TARGET_MEANING[draft.targetBits] ??
                  "A custom target. The analysis will say how many observations this process needs to reach it."}{" "}
                This decides the observation count the result recommends, nothing else.
              </span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="notes">
                Notes
              </label>
              <textarea
                className="textarea"
                id="notes"
                rows={3}
                value={draft.notes}
                placeholder="The surface, the room, who rolled, anything unusual."
                onChange={(e) => update({ notes: e.target.value })}
              />
              <span className="field__hint">
                When one session disagrees with another, these notes are the only record of what
                differed.
              </span>
            </div>
          </div>
        </div>

        <div className="stack">
          <div>
            <div className="section__kicker">Before you start rolling</div>
            <ProtocolCard protocol={protocol} />
          </div>
          <p className="t-micro">
            This summarises the published protocol. Decide the rules now rather than partway
            through: a re-roll rule invented after a surprising streak is not a rule.
          </p>
        </div>
      </section>

      <div className="btn-row">
        <button
          type="button"
          className="btn"
          disabled={!canContinue}
          onClick={() => {
            store.setProfile(draft);
            navigate("capture");
          }}
        >
          Continue to calibration
        </button>
        {!canContinue ? <span className="field__hint">Name the process to continue.</span> : null}
      </div>
    </div>
  );
}
