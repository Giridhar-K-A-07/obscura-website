import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

/*
  The "(external site)" label sits in a span inside an inline-flex link, which drops the space
  before it. Each component that renders one adds the margin the Learn components already use.
*/
const withLabel = [
  "src/components/events/EventAssets.astro",
  "src/components/achievements/SpotlightsSection.astro",
  "src/components/achievements/WinnersSection.astro",
  "src/components/home/ProjectCard.astro",
  "src/components/learn/DownloadItem.astro",
  "src/components/learn/RoadmapStep.astro",
];

describe("external-site labels", () => {
  for (const file of withLabel) {
    it(`${file} keeps the space before the label`, () => {
      const source = read(file);
      expect(source).toContain("(external site)");
      expect(source).toMatch(/\.(action|links a) span \{\s*margin-left: var\(--space-1\);/);
    });
  }

  it("shows the Projects labels through the card, not as part of the link text", () => {
    const list = read("src/components/projects/ProjectsList.astro");
    expect(list).not.toContain("(external site)");
    expect(list.match(/external: true/g)).toHaveLength(3);
    expect(read("src/components/home/ProjectCard.astro")).toContain("link.external &&");
  });

  it("does not duplicate the label text in any one link", () => {
    for (const file of withLabel) {
      const lines = read(file)
        .split("\n")
        .filter((l) => l.includes("(external site)"));
      for (const line of lines) expect(line.match(/\(external site\)/g)).toHaveLength(1);
    }
  });
});
