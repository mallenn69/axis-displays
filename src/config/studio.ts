import { z } from "zod";
export const studioCopy = {
  title: "Make room for your vision.",
  subtitle: "Start with a layout. Make it yours. We’ll handle the details.",
  quote: "Get my quote",
  quoteTitle: "Let’s bring this to your space.",
  quoteDetail:
    "We’ll use your layout to prepare a quote with both panel options, so you can compare the difference.",
  previewNote: "Design preview — requests are not sent yet.",
  disclaimer:
    "Concept preview. Dimensions are approximate; mounting and rigging are reviewed for your space.",
  contents: [
    { id: "motion", label: "Blue motion", note: "Flowing light" },
    { id: "aurora", label: "Aurora", note: "Soft color" },
    { id: "sunset", label: "Warm glow", note: "Warm color" },
    { id: "ice", label: "Ice", note: "Cool light" },
  ],
  presets: [
    { id: "wide", label: "Wide wall", note: "One continuous canvas" },
    { id: "split", label: "Three screens", note: "A balanced stage" },
    { id: "columns", label: "Columns", note: "Height and rhythm" },
    { id: "canopy", label: "Wall + overhead", note: "More dimension" },
  ],
} as const;
export const sectionSchema = z.object({
  kind: z.enum(["wall", "column", "overhead"]),
  id: z.string().max(80),
  name: z.string().min(1).max(40),
  cols: z.number().int().min(1).max(20),
  rows: z.number().int().min(1).max(12),
  x: z.number().min(-12).max(12),
  y: z.number().min(0.5).max(9),
  z: z.number().min(-5).max(5),
  tilt: z.number().min(-90).max(90),
  turn: z.number().min(-60).max(60),
});
export const studioSchema = z.object({
  sections: z.array(sectionSchema).min(1).max(8),
  content: z.enum(["motion", "aurora", "sunset", "ice"]),
  headline: z.string().max(42),
  subline: z.string().max(65),
  stageWidth: z.number().min(16).max(64),
  stageDepth: z.number().min(8).max(32),
});
export type Section = z.infer<typeof sectionSchema>;
export type StudioDesign = z.infer<typeof studioSchema>;
export type Preset = (typeof studioCopy.presets)[number]["id"];
export const section = (
  id: string,
  name: string,
  cols: number,
  rows: number,
  x = 0,
  y = 2.8,
  z = 0,
  tilt = 0,
): Section => ({
  kind: tilt ? "overhead" : cols === 1 ? "column" : "wall",
  id,
  name,
  cols,
  rows,
  x,
  y,
  z,
  tilt,
  turn: 0,
});
export function presetSections(id: Preset): Section[] {
  switch (id) {
    case "split":
      return [-1, 0, 1].map((v, i) =>
        section(
          `screen-${i}`,
          ["Left screen", "Center screen", "Right screen"][i]!,
          4,
          4,
          v * 3,
          2.8,
        ),
      );
    case "columns":
      return [-2, -1, 0, 1, 2].map((v, i) =>
        section(`column-${i}`, `Column ${i + 1}`, 1, 6, v * 1.8, 2.8),
      );
    case "canopy":
      return [
        section("wall", "Main wall", 8, 4, 0, 2.2),
        ...[-1, 0, 1].map((v, i) =>
          section(`overhead-${i}`, `Overhead ${i + 1}`, 2, 4, v * 2, 5, 1.2, -65),
        ),
      ];
    default:
      return [section("wall", "Main wall", 10, 5)];
  }
}
export const defaultDesign: StudioDesign = {
  sections: presetSections("wide"),
  content: "motion",
  headline: "WELCOME HOME",
  subline: "There is a place for you here.",
  stageWidth: 36,
  stageDepth: 16,
};
export const countPanels = (d: StudioDesign) => d.sections.reduce((n, s) => n + s.cols * s.rows, 0);
export const screenFeet = (cells: number) => ((cells * 0.5) / 0.3048).toFixed(1);

export type SimpleLayout = {
  cols: number;
  rows: number;
  sides: boolean;
  sideCols: number;
  sideRows: number;
  gap: number;
  overhead: boolean;
  overCount: number;
  overCols: number;
  overRows: number;
  tilt: number;
};
export const simpleDefault: SimpleLayout = {
  cols: 10,
  rows: 5,
  sides: false,
  sideCols: 1,
  sideRows: 5,
  gap: 1,
  overhead: false,
  overCount: 3,
  overCols: 2,
  overRows: 4,
  tilt: 55,
};
export function simpleSections(s: SimpleLayout): Section[] {
  const center = section("center", "Center wall", s.cols, s.rows, 0, s.rows * 0.25 + 0.7);
  center.kind = "wall";
  const list = [center];
  if (s.sides) {
    const x = s.cols * 0.25 + s.gap + s.sideCols * 0.25;
    for (const side of [-1, 1])
      list.push({
        ...section(
          `side-${side}`,
          side < 0 ? "Left columns" : "Right columns",
          s.sideCols,
          s.sideRows,
          side * x,
          s.sideRows * 0.25 + 0.7,
        ),
        kind: "column",
      });
  }
  if (s.overhead) {
    const spacing = Math.max(s.overCols * 0.5 + 0.6, (s.cols * 0.5) / s.overCount);
    for (let i = 0; i < s.overCount; i++)
      list.push({
        ...section(
          `over-${i}`,
          `Overhead ${i + 1}`,
          s.overCols,
          s.overRows,
          (i - (s.overCount - 1) / 2) * spacing,
          s.rows * 0.5 + 1.8 + s.overRows * 0.1,
          0,
          -s.tilt,
        ),
        kind: "overhead",
      });
  }
  return list;
}
