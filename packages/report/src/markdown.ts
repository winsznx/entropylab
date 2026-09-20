import type { EstimatorResult } from "@entropylab/core";
import type { EntropyReport } from "./types.js";

/**
 * Renders a report as Markdown.
 *
 * Generated from the canonical JSON rather than assembled alongside it, so the
 * two cannot drift and the document can never state something the machine
 * result does not.
 */
export function renderMarkdown(report: EntropyReport): string {
  const { analysis, dataset, process } = report;
  const lines: string[] = [];

  lines.push(`# Entropy profile: ${process.name}`);
  lines.push("");
  lines.push(
    "EntropyLab profiles an entropy-generation process. It does not generate, inspect, " +
      "or handle seed material.",
  );
  lines.push("");

  lines.push("## Result");
  lines.push("");
  if (analysis.conservativeBitsPerSymbol === undefined) {
    lines.push(
      "**No entropy rate is reported.** No estimator could run on this dataset. " +
        "That is a statement about the sample, not about the source.",
    );
  } else {
    const limiting = analysis.estimators.find((e) => e.id === analysis.limitingEstimator);
    lines.push(
      `**${analysis.conservativeBitsPerSymbol.toFixed(4)} bits per symbol** ` +
        `(conservative estimate, against an ideal of ${analysis.idealBitsPerSymbol.toFixed(4)} ` +
        `for a ${analysis.alphabetSize}-symbol alphabet).`,
    );
    lines.push("");
    lines.push(`Limiting estimator: **${limiting?.label ?? analysis.limitingEstimator}**.`);
  }
  lines.push("");

  lines.push("## Dataset");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Source | ${dataset.source} |`);
  lines.push(`| Observations | ${dataset.sampleCount} |`);
  lines.push(`| Alphabet size | ${dataset.alphabetSize} |`);
  lines.push(`| Collection method | ${process.collectionMethod ?? "not recorded"} |`);
  lines.push(`| Input hash (SHA-256) | \`${dataset.inputHash}\` |`);
  lines.push(`| Algorithm version | ${report.algorithmVersion} |`);
  lines.push(`| Report format | ${report.reportFormatVersion} |`);
  if (report.generatedAt) lines.push(`| Generated | ${report.generatedAt} |`);
  lines.push("");

  lines.push("## Estimators");
  lines.push("");
  lines.push("| Estimator | Bits per symbol | Status |");
  lines.push("| --- | --- | --- |");
  for (const result of analysis.estimators) {
    lines.push(`| ${result.label} | ${formatBits(result)} | ${formatStatus(result)} |`);
  }
  lines.push("");

  const withWarnings = analysis.estimators.filter((e) => e.warnings.length > 0);
  if (analysis.warnings.length > 0 || withWarnings.length > 0) {
    lines.push("## What to know about this result");
    lines.push("");
    for (const warning of analysis.warnings) lines.push(`- ${warning}`);
    for (const result of withWarnings) {
      for (const warning of result.warnings) lines.push(`- **${result.label}:** ${warning}`);
    }
    lines.push("");
  }

  lines.push("## Target guidance");
  lines.push("");
  const reachable = analysis.targetGuidance.filter((g) => g.estimatedSamplesRequired !== undefined);
  if (reachable.length === 0) {
    lines.push(
      "No observation count is given. The measured rate does not support reaching a " +
        "target by collecting more data from this process; the process itself needs to change.",
    );
  } else {
    lines.push("| Target | Observations required at the measured rate |");
    lines.push("| --- | --- |");
    for (const guidance of analysis.targetGuidance) {
      lines.push(
        `| ${guidance.targetBits} bits | ${guidance.estimatedSamplesRequired ?? "not reachable"} |`,
      );
    }
    lines.push("");
    lines.push(
      "These counts follow from the calibration sample. They are guidance, not a " +
        "guarantee about observations that have not been made yet.",
    );
  }
  lines.push("");

  lines.push("## Assumptions");
  lines.push("");
  for (const assumption of report.assumptions) lines.push(`- ${assumption}`);
  lines.push("");

  lines.push("## Limitations");
  lines.push("");
  for (const limitation of report.limitations) lines.push(`- ${limitation}`);
  lines.push("");

  return lines.join("\n");
}

function formatBits(result: EstimatorResult): string {
  if (!result.applicable || result.bitsPerSymbol === undefined) return "not applicable";
  return result.bitsPerSymbol.toFixed(4);
}

function formatStatus(result: EstimatorResult): string {
  if (!result.applicable) return `declined (${result.inapplicabilityReason ?? "unspecified"})`;
  if (result.quality === "unstable") return "unstable, treat as indicative";
  return "usable";
}
