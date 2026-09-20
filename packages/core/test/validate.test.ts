import { describe, expect, it } from "vitest";
import { assertValidSample, InvalidSampleError, symbolCounts } from "../src/index.js";

describe("assertValidSample", () => {
  it("accepts a well-formed sample", () => {
    expect(() => assertValidSample({ alphabetSize: 6, observations: [0, 5, 3] })).not.toThrow();
  });

  it("rejects an alphabet smaller than two symbols", () => {
    expect(() => assertValidSample({ alphabetSize: 1, observations: [0] })).toThrow(
      InvalidSampleError,
    );
  });

  it("rejects an empty observation list", () => {
    expect(() => assertValidSample({ alphabetSize: 6, observations: [] })).toThrow(
      InvalidSampleError,
    );
  });

  it("rejects an observation outside the alphabet", () => {
    expect(() => assertValidSample({ alphabetSize: 6, observations: [0, 6] })).toThrow(
      /outside the alphabet/,
    );
  });

  it("rejects a non-integer observation", () => {
    expect(() => assertValidSample({ alphabetSize: 6, observations: [1.5] })).toThrow(
      InvalidSampleError,
    );
  });
});

describe("symbolCounts", () => {
  it("counts every symbol including unobserved ones", () => {
    expect(symbolCounts({ alphabetSize: 4, observations: [0, 0, 2, 2, 2] })).toEqual([2, 0, 3, 0]);
  });
});
