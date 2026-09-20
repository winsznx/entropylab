import type { Route } from "../routing.js";

const STEPS: { route: Route; label: string }[] = [
  { route: "define", label: "Define process" },
  { route: "capture", label: "Calibrate" },
  { route: "analysis", label: "Analyze" },
  { route: "export", label: "Export" },
];

/**
 * Numbered progress through the flow.
 *
 * Numbered because this genuinely is a sequence: each step needs the output of
 * the one before it, and a step is disabled until its input exists.
 */
export function StepRail({
  current,
  navigate,
  hasProfile,
  hasObservations,
}: {
  current: Route;
  navigate: (route: Route) => void;
  hasProfile: boolean;
  hasObservations: boolean;
}): JSX.Element {
  const enabled = (route: Route): boolean => {
    if (route === "define") return true;
    if (route === "capture") return hasProfile;
    return hasProfile && hasObservations;
  };

  return (
    <nav className="rail" aria-label="Calibration steps">
      {STEPS.map((step, index) => (
        <button
          type="button"
          key={step.route}
          className="rail__step"
          aria-current={current === step.route ? "step" : undefined}
          disabled={!enabled(step.route)}
          onClick={() => navigate(step.route)}
        >
          <span className="rail__index">{index + 1}</span>
          {step.label}
        </button>
      ))}
    </nav>
  );
}
