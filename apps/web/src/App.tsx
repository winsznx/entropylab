import { useEffect, useState } from "react";
import { useRoute } from "./routing.js";
import { StoreProvider, useStore } from "./state/store.js";
import { StepRail } from "./components/StepRail.js";
import { Home } from "./screens/Home.js";
import { Define } from "./screens/Define.js";
import { Capture } from "./screens/Capture.js";
import { Analysis } from "./screens/Analysis.js";
import { Export } from "./screens/Export.js";
import { Profiles } from "./screens/Profiles.js";
import { About } from "./screens/About.js";

function Shell(): JSX.Element {
  const [route, navigate] = useRoute();
  const store = useStore();
  const online = useOnlineStatus();

  const inFlow =
    route === "define" || route === "capture" || route === "analysis" || route === "export";

  return (
    <div className="shell">
      <header className="masthead">
        <button type="button" className="masthead__mark" onClick={() => navigate("home")}>
          EntropyLab
        </button>
        <nav className="button-row" aria-label="Sections">
          <button type="button" className="button button--quiet" onClick={() => navigate("define")}>
            New calibration
          </button>
          <button
            type="button"
            className="button button--quiet"
            onClick={() => navigate("profiles")}
          >
            Saved data
          </button>
          <button type="button" className="button button--quiet" onClick={() => navigate("about")}>
            How it was tested
          </button>
        </nav>
        <div className="masthead__status" title="Analysis runs in this page. Nothing is uploaded.">
          <span className={`masthead__dot${online ? "" : " masthead__dot--offline"}`} />
          {online ? "local only" : "offline, still working"}
        </div>
      </header>

      <main className="page">
        {inFlow ? (
          <StepRail
            current={route}
            navigate={navigate}
            hasProfile={store.profile !== null}
            hasObservations={store.observations.length > 0}
          />
        ) : null}

        {route === "home" ? <Home navigate={navigate} /> : null}
        {route === "define" ? <Define navigate={navigate} /> : null}
        {route === "capture" ? <Capture navigate={navigate} /> : null}
        {route === "analysis" ? <Analysis navigate={navigate} /> : null}
        {route === "export" ? <Export navigate={navigate} /> : null}
        {route === "profiles" ? <Profiles navigate={navigate} /> : null}
        {route === "about" ? <About /> : null}
      </main>

      <footer className="foot">
        <div className="foot__inner">
          <span>Analysis runs in this page. No account, no telemetry, nothing uploaded.</span>
          <span>Never enter a seed phrase or private key.</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Reports connectivity so the interface can show that it keeps working without
 * it. The application makes no network requests either way; this is a claim the
 * user can verify by pulling the plug.
 */
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function App(): JSX.Element {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
