/**
 * Runs the physical dice campaign over recorded session files.
 *
 * Reads every `physical-d6-session-*.txt` in data/physical, analyses each
 * session on its own, analyses the concatenation, compares sessions against
 * each other, and writes reports to docs/proof-campaign/physical/.
 *
 * Exits without writing anything when no session files exist. There is no
 * fallback to synthetic data: a physical campaign with invented observations
 * would look identical to a real one and mean nothing.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, parseSample, type EntropyAnalysis, type EntropySample } from "@entropylab/core";
import { buildReport, renderMarkdown, type ProcessProfile } from "@entropylab/report";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "data", "physical");
const outputDir = join(here, "..", "docs", "proof-campaign", "physical");

const ALPHABET_SIZE = 6;
const ESTIMATOR_ORDER = ["most-common-value", "collision", "markov", "lag-predictor"] as const;

interface Session {
  id: string;
  file: string;
  header: string[];
  sample: EntropySample;
  analysis: EntropyAnalysis;
}

function readSessions(): Session[] {
  let files: string[];
  try {
    files = readdirSync(dataDir);
  } catch {
    return [];
  }

  return files
    .filter((name) => /^physical-d6-session-.*\.txt$/.test(name) && !name.startsWith("EXAMPLE"))
    .sort()
    .map((file) => {
      const text = readFileSync(join(dataDir, file), "utf8");
      const { sample, issues } = parseSample(text, { alphabetSize: ALPHABET_SIZE });

      if (issues.length > 0) {
        process.stderr.write(`${file}: ${issues.length} unreadable token(s)\n`);
        for (const issue of issues.slice(0, 10)) {
          process.stderr.write(`  line ${issue.line}: ${JSON.stringify(issue.token)}\n`);
        }
        process.exit(1);
      }
      if (sample.observations.length === 0) {
        process.stderr.write(`${file}: contains no observations\n`);
        process.exit(1);
      }

      return {
        id: file.replace(/\.txt$/, ""),
        file,
        header: text
          .split(/\r?\n/)
          .filter((line) => line.trim().startsWith("#"))
          .map((line) => line.trim().replace(/^#\s?/, "")),
        sample,
        analysis: analyze(sample),
      };
    });
}

function profileFor(name: string, note: string): ProcessProfile {
  return {
    name,
    sourceType: "d6",
    alphabetSize: ALPHABET_SIZE,
    collectionMethod: "physical dice, recorded by hand",
    notes: note,
  };
}

function bits(analysis: EntropyAnalysis, id: string): number | null {
  const result = analysis.estimators.find((e) => e.id === id);
  if (!result?.applicable || result.bitsPerSymbol === undefined) return null;
  return result.bitsPerSymbol;
}

function cell(value: number | null): string {
  return value === null ? "declined" : value.toFixed(4);
}

function row(label: string, analysis: EntropyAnalysis): string {
  const values = ESTIMATOR_ORDER.map((id) => cell(bits(analysis, id)));
  return (
    `| ${label} | ${analysis.sampleCount} | ${values.join(" | ")} | ` +
    `${analysis.conservativeBitsPerSymbol?.toFixed(4) ?? "none"} | ` +
    `${analysis.limitingEstimator ?? "none"} |`
  );
}

function main(): void {
  const sessions = readSessions();

  if (sessions.length === 0) {
    process.stdout.write(
      "No physical session files found in data/physical.\n" +
        "Add physical-d6-session-1.txt and re-run. Nothing was written.\n",
    );
    return;
  }

  mkdirSync(outputDir, { recursive: true });

  const combinedSample: EntropySample = {
    alphabetSize: ALPHABET_SIZE,
    observations: sessions.flatMap((s) => s.sample.observations),
  };
  const combinedAnalysis = analyze(combinedSample);

  for (const session of sessions) {
    const report = buildReport({
      profile: profileFor(session.id, session.header.join(" | ")),
      sample: session.sample,
      analysis: session.analysis,
      datasetSource: session.file,
    });
    writeFileSync(join(outputDir, `${session.id}.json`), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(join(outputDir, `${session.id}.md`), renderMarkdown(report));
  }

  const combinedReport = buildReport({
    profile: profileFor(
      "physical-d6-combined",
      `concatenation of ${sessions.length} sessions in recorded order`,
    ),
    sample: combinedSample,
    analysis: combinedAnalysis,
    datasetSource: sessions.map((s) => s.file).join(", "),
  });
  writeFileSync(join(outputDir, "combined.json"), `${JSON.stringify(combinedReport, null, 2)}\n`);
  writeFileSync(join(outputDir, "combined.md"), renderMarkdown(combinedReport));

  // Cross-session spread. A process that is stable over time should produce
  // similar figures per session; a wide spread is evidence the process moved
  // between sessions, which a single combined number would hide.
  const perSession = sessions
    .map((s) => s.analysis.conservativeBitsPerSymbol)
    .filter((v): v is number => v !== undefined);
  const spread = perSession.length > 1 ? Math.max(...perSession) - Math.min(...perSession) : null;

  const doc = [
    "# Physical dice campaign",
    "",
    "**This is a practical calibration demonstration, not formal entropy-source",
    "certification.** SP 800-90B's assessment process assumes at least 1,000,000",
    "samples and a documented submission describing the noise source. These are a",
    "few hundred hand-recorded rolls. They support a decision about whether to",
    "trust a procedure; they do not support a certification.",
    "",
    "Generated by `pnpm campaign:physical` from the files in `data/physical`.",
    "Every number below comes from that run.",
    "",
    "## Results",
    "",
    "Estimated min-entropy in bits per symbol, against a 2.5850 ideal for six faces.",
    "",
    "| Dataset | Observations | Most common value | Collision | Markov | Lag predictor | Conservative | Limiting |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...sessions.map((s) => row(s.id, s.analysis)),
    row("**combined**", combinedAnalysis),
    "",
    "## Session agreement",
    "",
    spread === null
      ? "Only one session was analysed, so no cross-session comparison is possible. " +
        "A single session cannot show whether the process is stable over time."
      : `The conservative estimates across sessions span ${spread.toFixed(4)} bits per symbol ` +
        `(lowest ${Math.min(...perSession).toFixed(4)}, highest ${Math.max(...perSession).toFixed(4)}).`,
    "",
    spread !== null && spread > 0.5
      ? "That spread is wide. Sessions were recorded from the same die and procedure, so a " +
        "difference this size is evidence the process changed between them rather than " +
        "evidence about the die. Treat the combined figure with caution: it averages over a " +
        "process that was not the same throughout."
      : spread !== null
        ? "That spread is narrow enough to be consistent with sampling variation at this " +
          "sample size, which is weak evidence that the process was stable across sessions. " +
          "It is not proof of stability; three sessions cannot establish that."
        : "",
    "",
    "## Estimator disagreement",
    "",
    "| Dataset | Highest | Lowest | Spread |",
    "| --- | --- | --- | --- |",
    ...[
      ...sessions.map((s) => [s.id, s.analysis] as const),
      ["combined", combinedAnalysis] as const,
    ].map(([label, analysis]) => {
      const values = ESTIMATOR_ORDER.map((id) => bits(analysis, id)).filter(
        (v): v is number => v !== null,
      );
      if (values.length === 0) return `| ${label} | none | none | none |`;
      const high = Math.max(...values);
      const low = Math.min(...values);
      return `| ${label} | ${high.toFixed(4)} | ${low.toFixed(4)} | ${(high - low).toFixed(4)} |`;
    }),
    "",
    "Disagreement is expected when one method detects structure the others cannot see.",
    "The lowest figure governs.",
    "",
    "## Target guidance",
    "",
    "From the combined conservative estimate. This follows from the calibration sample",
    "and is not a guarantee about rolls that have not been made yet.",
    "",
    "| Target | Observations required |",
    "| --- | --- |",
    ...combinedAnalysis.targetGuidance.map(
      (g) =>
        `| ${g.targetBits} bits | ${g.estimatedSamplesRequired ?? "not reachable at this rate"} |`,
    ),
    "",
    "## Sessions",
    "",
    ...sessions.flatMap((s) => [
      `### ${s.id}`,
      "",
      `[JSON](./${s.id}.json) | [Markdown](./${s.id}.md)`,
      "",
      ...(s.header.length > 0 ? s.header.map((line) => `- ${line}`) : ["No header recorded."]),
      "",
    ]),
    "## Combined",
    "",
    "[JSON](./combined.json) | [Markdown](./combined.md)",
    "",
    "## Reuse warning",
    "",
    "These observations are published. They are calibration data and must never be",
    "used as seed material.",
    "",
  ].join("\n");

  writeFileSync(join(outputDir, "README.md"), doc);

  process.stdout.write(
    `Analysed ${sessions.length} session(s), ${combinedSample.observations.length} observations\n`,
  );
  for (const session of sessions) process.stdout.write(`${row(session.id, session.analysis)}\n`);
  process.stdout.write(`${row("combined", combinedAnalysis)}\n`);
}

main();
