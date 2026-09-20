import { useEffect, useState } from "react";

export type Route = "home" | "define" | "capture" | "analysis" | "export" | "profiles" | "about";

const ROUTES: Route[] = ["home", "define", "capture", "analysis", "export", "profiles", "about"];

function readHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : "home";
}

/**
 * Hash routing, so the back button works and a screen can be linked to
 * without pulling in a router. Hash rather than history API because the built
 * application is opened from a file path or a static host with no server to
 * rewrite unknown paths.
 */
export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(readHash);

  useEffect(() => {
    const onChange = (): void => setRoute(readHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (next: Route): void => {
    window.location.hash = `/${next}`;
    // Moving between screens should start at the top, as a page navigation
    // would.
    window.scrollTo({ top: 0 });
  };

  return [route, navigate];
}
