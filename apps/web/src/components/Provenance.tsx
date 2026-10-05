import { PROVENANCE_LABEL, type Provenance as Kind } from "../state/session.js";

const DETAIL: Record<Kind, string> = {
  synthetic:
    "Generated from a seeded source with a defect deliberately injected, to test the methods against an answer known in advance. These observations never touched a die.",
  physical:
    "Rolled by hand and recorded in the order they occurred. Evidence about one die, one procedure and one operator, and about nothing else.",
  imported:
    "Read from a file or pasted in. The order is preserved exactly as supplied, because every sequential method depends on it.",
  manual: "Entered one outcome at a time in the order they occurred.",
};

/**
 * States where a dataset came from, wherever a result is shown.
 *
 * Synthetic fixtures must never be mistakable for measured physical evidence.
 * The distinction is load-bearing for the product's credibility, so it is a
 * labelled band above the result rather than a footnote beneath it, and the
 * synthetic band is deliberately the one that looks least like a measurement.
 */
export function Provenance({ provenance }: { provenance: Kind }): JSX.Element {
  return (
    <div className={`provenance provenance--${provenance}`}>
      <span className="provenance__label">{PROVENANCE_LABEL[provenance]}</span>
      <span className="provenance__detail">{DETAIL[provenance]}</span>
    </div>
  );
}
