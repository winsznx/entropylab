import { useState } from "react";
import { useStore } from "../state/store.js";
import type { Route } from "../routing.js";

export function Profiles({ navigate }: { navigate: (route: Route) => void }): JSX.Element {
  const store = useStore();
  const [confirmingWipe, setConfirmingWipe] = useState(false);

  return (
    <>
      <div className="sheet__title">
        <h1>Saved data</h1>
        <span className="sheet__note">this browser only</span>
      </div>
      <p style={{ marginBottom: 28 }}>
        Profiles and calibration sessions are stored in this browser. They are not synced, not
        backed up, and not readable by anything else. Clearing your browser data removes them.
      </p>

      {!store.storageAvailable ? (
        <div className="notice notice--info">
          This browser is not allowing local storage, which happens in private windows and when site
          data is blocked. EntropyLab still works; nothing will be kept after you close the tab.
        </div>
      ) : null}

      <section className="sheet">
        <div className="sheet__title">
          <h2>Private session</h2>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={store.privateSession}
              style={{ width: "auto", marginTop: 4 }}
              onChange={(e) => store.setPrivateSession(e.target.checked)}
            />
            <span>
              Do not save anything this visit
              <span className="field__hint" style={{ marginTop: 2 }}>
                Blocks every write to this browser until you turn it off. Analysis and export still
                work; you just cannot come back to the session later.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Profiles</h2>
          <span className="sheet__note">{store.savedProfiles.length} stored</span>
        </div>
        {store.savedProfiles.length === 0 ? (
          <p className="field__hint" style={{ margin: 0 }}>
            Nothing saved yet. Finish a calibration and save it from the export screen.
          </p>
        ) : (
          <div className="saved-list">
            {store.savedProfiles.map((profile) => {
              const sessions = store.savedSessions.filter((s) => s.profileId === profile.id);
              return (
                <div className="saved" key={profile.id}>
                  <span className="saved__name">{profile.name || "Untitled"}</span>
                  <span className="saved__meta">
                    {sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
                    {sessions[0]?.observations.length ?? 0} observations
                  </span>
                  <span className="saved__actions">
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={async () => {
                        await store.loadProfile(profile.id);
                        navigate("analysis");
                      }}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => void store.deleteProfile(profile.id)}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="sheet">
        <div className="sheet__title">
          <h2>Remove everything</h2>
        </div>
        <p>
          Deletes every profile and session EntropyLab has stored in this browser. This cannot be
          undone.
        </p>
        <div className="button-row">
          {confirmingWipe ? (
            <>
              <button
                type="button"
                className="button"
                onClick={async () => {
                  await store.forgetEverything();
                  setConfirmingWipe(false);
                }}
              >
                Yes, delete everything
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setConfirmingWipe(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setConfirmingWipe(true)}
            >
              Delete all saved data
            </button>
          )}
        </div>
      </section>
    </>
  );
}
