/**
 * Guardrails against a user pasting secret material into a calibration field.
 *
 * These are a safety net, not a secret detector, and the product says so where
 * they are used. They look for the shapes that seed material usually takes;
 * they cannot recognise every encoding of a key, and a determined paste will
 * get through. The value is in catching the realistic accident, which is
 * someone pasting a recovery sheet into the wrong box.
 *
 * Detection runs locally on text the user has already typed. Nothing is
 * transmitted, and the matched text is never included in the returned reason.
 */
export type SecretSignal =
  "mnemonic-like-word-run" | "extended-key-prefix" | "wif-private-key" | "hex-key-length";

export interface SecretWarning {
  signal: SecretSignal;
  message: string;
}

/** Mnemonic lengths defined by BIP39. */
const MNEMONIC_LENGTHS = new Set([12, 15, 18, 21, 24]);

/**
 * Shortest run of lowercase words that triggers the mnemonic heuristic.
 *
 * Set below the 12-word minimum so a partially pasted phrase is still caught.
 * Calibration input is digits and separators, so a run of words this long is
 * already not what the field is for, whatever it turns out to be.
 */
const WORD_RUN_THRESHOLD = 8;

export function detectSecretMaterial(text: string): SecretWarning[] {
  const warnings: SecretWarning[] = [];
  const trimmed = text.trim();
  if (trimmed === "") return warnings;

  const words = trimmed.split(/\s+/);
  const alphabeticRun = longestRunOfWords(words);

  if (alphabeticRun >= WORD_RUN_THRESHOLD) {
    warnings.push({
      signal: "mnemonic-like-word-run",
      message: MNEMONIC_LENGTHS.has(alphabeticRun)
        ? `This looks like a ${alphabeticRun}-word recovery phrase. EntropyLab never needs one. ` +
          "Clear this field and enter only your recorded observations."
        : `This contains a run of ${alphabeticRun} words. Calibration input should be recorded ` +
          "symbols, not words. If this is seed material, clear it now.",
    });
  }

  if (/\b[xyzt](?:prv|pub)[1-9A-HJ-NP-Za-km-z]{20,}/.test(trimmed)) {
    warnings.push({
      signal: "extended-key-prefix",
      message:
        "This contains something shaped like an extended key. EntropyLab never needs wallet keys. " +
        "Clear this field.",
    });
  }

  if (/(?:^|\s)[5KL][1-9A-HJ-NP-Za-km-z]{50,51}(?:\s|$)/.test(trimmed)) {
    warnings.push({
      signal: "wif-private-key",
      message: "This contains something shaped like a private key in WIF format. Clear this field.",
    });
  }

  if (/(?:^|\s)(?:0x)?[0-9a-fA-F]{64}(?:\s|$)/.test(trimmed)) {
    warnings.push({
      signal: "hex-key-length",
      message:
        "This contains a 64-character hexadecimal string, the length of a private key or seed. " +
        "If that is what it is, clear this field.",
    });
  }

  return warnings;
}

function longestRunOfWords(tokens: string[]): number {
  let longest = 0;
  let current = 0;
  for (const token of tokens) {
    if (/^[a-z]{3,}$/.test(token)) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}
