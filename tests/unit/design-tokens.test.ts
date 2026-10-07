import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(new URL("../../src/styles/tokens.css", import.meta.url), "utf8");

function colour(name: string): string {
  const match = tokens.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`token --color-${name} not found`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(colour(a)), luminance(colour(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("design tokens (provisional)", () => {
  it.each([
    ["lumen", "ink"],
    ["lumen", "chamber"],
    ["mist", "ink"],
    ["mist", "chamber"],
    ["aperture", "ink"],
    ["aperture", "chamber"],
    ["ink", "aperture"], // text on primary button
  ])("text %s on %s meets WCAG AA 4.5:1", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([["ink"], ["chamber"]])("UI border haze on %s meets 3:1", (bg) => {
    expect(contrast("haze", bg)).toBeGreaterThanOrEqual(3);
  });

  it("documents that haze is not for body text", () => {
    expect(contrast("haze", "ink")).toBeLessThan(4.5);
  });

  it("labels the file provisional and does not claim official status", () => {
    expect(tokens).toMatch(/PROVISIONAL/);
    expect(tokens).toMatch(/\[\[NEEDED: official brand colours/);
    expect(tokens).toMatch(/\[\[NEEDED: font decision/);
  });
});
