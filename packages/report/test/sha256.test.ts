import { describe, expect, it } from "vitest";
import { sha256Hex } from "../src/sha256.js";

describe("sha256", () => {
  // Published FIPS 180-4 vectors.
  it("hashes the empty string", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("hashes abc", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes the 448-bit vector", () => {
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("hashes across a block boundary", () => {
    expect(sha256Hex("a".repeat(1000000)).slice(0, 16)).toBe("cdc76e5c9914fb92");
  });

  // Cross-checked against Node's crypto module, which is unavailable in the
  // browser target and so cannot be used by the implementation itself.
  it("encodes two-byte characters as UTF-8", () => {
    expect(sha256Hex("\u00e9")).toBe(
      "4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c",
    );
  });

  it("encodes surrogate pairs as four-byte UTF-8", () => {
    expect(sha256Hex("dice \u{1F3B2}")).toBe(
      "0b51e3a0ff7e3a67c93b3337ae246e7a4a94527e9a5937845ba62cd75364aa90",
    );
  });
});
