import { useEffect, useState } from "react";
import { useRoute, type Route } from "./routing.js";
import { StoreProvider, useStore } from "./state/store.js";
import { StepRail } from "./components/StepRail.js";
import { ThemeToggle } from "./components/ThemeToggle.js";
import { Icon } from "./components/Icon.js";
import { Home } from "./screens/Home.js";
import { Define } from "./screens/Define.js";
import { Capture } from "./screens/Capture.js";
import { Analysis } from "./screens/Analysis.js";
import { Export } from "./screens/Export.js";
import { Profiles } from "./screens/Profiles.js";
import { About } from "./screens/About.js";

const FLOW: Route[] = ["define", "capture", "analysis", "export"];

function Shell(): JSX.Element {
  const [route, navigate] = useRoute();
  const store = useStore();
  const online = useOnlineStatus();
  const inFlow = FLOW.includes(route);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <button type="button" className="masthead__mark" onClick={() => navigate("home")}>
          <Icon name="dice" size={18} />
          EntropyLab
        </button>

        <nav className="masthead__nav" aria-label="Sections">
          <button
            type="button"
            className="navlink"
            aria-current={inFlow ? "page" : undefined}
            onClick={() => {
              // Starting a new calibration has to clear the working session.
              // Without this the next profile inherited the previous one's
              // identity, and saving it overwrote the earlier record.
              store.reset();
              navigate("define");
            }}
          >
            New calibration
          </button>
          <button
            type="button"
            className="navlink"
            aria-current={route === "profiles" ? "page" : undefined}
            onClick={() => navigate("profiles")}
          >
            Saved data
          </button>
          <button
            type="button"
            className="navlink"
            aria-current={route === "about" ? "page" : undefined}
            onClick={() => navigate("about")}
          >
            How it was tested
          </button>
        </nav>

        <div className="masthead__spacer" />
        <ThemeToggle />
        <span
          className={`status-chip${online ? "" : " status-chip--offline"}`}
          title="Analysis runs in this page. Nothing is uploaded."
        >
          <span className="status-chip__dot" />
          <span className="status-chip__text">
            {online ? "local only" : "offline, still working"}
          </span>
          <span className="visually-hidden">
            {online ? "Analysis is local only" : "Offline, and still working"}
          </span>
        </span>
      </header>

      <main id="main" className={route === "home" ? "page page--wide" : "page"}>
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
 * Reports connectivity so the interface can show that it keeps working
 * without it. The application makes no request either way; this is a claim
 * the reader can check by pulling the plug.
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
