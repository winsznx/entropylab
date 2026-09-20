import { describe, expect, it } from "vitest";
import { parseObservations, parseSample, formatObservations, defaultLabels } from "../src/parse.js";
import { detectSecretMaterial } from "../src/guardrails.js";

const d6 = { alphabetSize: 6 };

describe("parsing recorded observations", () => {
  it("reads one symbol per line", () => {
    expect(parseObservations("1\n2\n6\n", d6).observations).toEqual([0, 1, 5]);
  });

  it("reads space, comma and semicolon separated values", () => {
    expect(parseObservations("1 2 3", d6).observations).toEqual([0, 1, 2]);
    expect(parseObservations("1,2,3", d6).observations).toEqual([0, 1, 2]);
    expect(parseObservations("1; 2 ;3", d6).observations).toEqual([0, 1, 2]);
  });

  it("reads a mixture of layouts in one input", () => {
    // Real recorded sessions are not tidy.
    expect(parseObservations("1 2\n3,4\n\n5 6", d6).observations).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("maps one-based labels to zero-based symbol ids", () => {
    // A person writes 1..6; the estimators consume 0..5.
    expect(parseObservations("6", d6).observations).toEqual([5]);
    expect(defaultLabels(6)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("ignores comments and blank lines and counts them", () => {
    const result = parseObservations("# session 1, kitchen table\n\n1 2 3\n# break\n4", d6);
    expect(result.observations).toEqual([0, 1, 2, 3]);
    expect(result.skippedLines).toBe(3);
  });

  it("collects every bad token instead of throwing on the first", () => {
    // One typo in six hundred rolls should not cost the operator the session,
    // and they need to see all the problems in a single pass.
    const result = parseObservations("1 2 x 4\n9 5", d6);
    expect(result.observations).toEqual([0, 1, 3, 4]);
    expect(result.issues).toEqual([
      { line: 1, token: "x", reason: "unknown-symbol" },
      { line: 2, token: "9", reason: "unknown-symbol" },
    ]);
  });

  it("reports the line number a bad token appeared on", () => {
    const result = parseObservations("1\n2\n\n#note\nzz", d6);
    expect(result.issues[0]?.line).toBe(5);
  });

  it("supports custom labels for a non-numeric alphabet", () => {
    const result = parseObservations("H T H", { alphabetSize: 2, labels: ["H", "T"] });
    expect(result.observations).toEqual([0, 1, 0]);
  });

  it("matches labels case-insensitively", () => {
    const result = parseObservations("h t", { alphabetSize: 2, labels: ["H", "T"] });
    expect(result.observations).toEqual([0, 1]);
  });

  it("builds a sample carrying the alphabet size", () => {
    const { sample } = parseSample("1 2 3", d6);
    expect(sample).toEqual({ alphabetSize: 6, observations: [0, 1, 2] });
  });

  it("round-trips through formatting", () => {
    const text = "1 4 6 2";
    const { sample } = parseSample(text, d6);
    expect(formatObservations(sample)).toBe(text);
  });

  it("returns an empty result for empty input rather than failing", () => {
    const result = parseObservations("   \n\n", d6);
    expect(result.observations).toEqual([]);
    expect(result.issues).toEqual([]);
  });
});

describe("secret material guardrails", () => {
  it("flags a twelve word phrase", () => {
    const phrase =
      "abandon ability able about above absent absorb abstract absurd abuse access accident";
    const warnings = detectSecretMaterial(phrase);
    expect(warnings[0]?.signal).toBe("mnemonic-like-word-run");
    expect(warnings[0]?.message).toMatch(/12-word recovery phrase/);
  });

  it("flags a partial phrase below the BIP39 lengths", () => {
    // Catching a partly pasted phrase matters as much as a complete one.
    const warnings = detectSecretMaterial(
      "abandon ability able about above absent absorb abstract",
    );
    expect(warnings[0]?.signal).toBe("mnemonic-like-word-run");
  });

  it("flags an extended key", () => {
    const key = `xprv${"9".repeat(4)}${"abcdefghijkmnpqrstuvwxyz".repeat(2)}`;
    expect(detectSecretMaterial(key)[0]?.signal).toBe("extended-key-prefix");
  });

  it("flags a WIF private key", () => {
    // Base58 excludes 0, O, I and l, so the body is built from the permitted
    // characters only. An earlier version of this test used a string
    // containing "0" and the guardrail correctly declined to match it.
    const base58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const wif = `L${base58.repeat(2).slice(0, 51)}`;
    expect(wif).toHaveLength(52);
    expect(detectSecretMaterial(wif).some((w) => w.signal === "wif-private-key")).toBe(true);
  });

  it("flags a 64 character hex string", () => {
    expect(detectSecretMaterial("a".repeat(64))[0]?.signal).toBe("hex-key-length");
  });

  it("does not flag ordinary calibration input", () => {
    expect(detectSecretMaterial("1 2 3 4 5 6 1 2 3 4 5 6")).toEqual([]);
    expect(detectSecretMaterial("# session one\n1,2,3,4")).toEqual([]);
    expect(detectSecretMaterial("H T H T H T")).toEqual([]);
  });

  it("does not flag a short note", () => {
    expect(detectSecretMaterial("rolled on a wooden table")).toEqual([]);
  });

  it("never echoes the matched text back", () => {
    // The warning is rendered in the UI; repeating the secret would put it on
    // screen a second time.
    const phrase =
      "abandon ability able about above absent absorb abstract absurd abuse access accident";
    for (const warning of detectSecretMaterial(phrase)) {
      expect(warning.message).not.toContain("abandon");
    }
  });
});
