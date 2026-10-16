import { z } from "zod";

// Purchase prices are loaded from the staff-only database, never bundled into the site.
export const costLabels = {
  single: "Pro 2.6mm single panel",
  double: "Pro 2.6mm double panel",
  vx1000: "NovaStar VX1000 Pro",
  vx600: "NovaStar VX600",
  singleCase: "Flight case · 8 singles",
  doubleCase: "Flight case · 6 doubles",
  base: "Global Truss 2X2S base plate",
  truss: "F34 8.2 ft matte-black truss",
  clamp: "Panel-to-truss clamp",
  bar: "Hanging bar",
  sling: "SpanSet sling",
} as const;
export type CostKey = keyof typeof costLabels;
const money = z.number().finite().min(0).max(10000000);
const count = z.number().int().min(0).max(10000);
export const catalogSchema = z
  .object({
    prices: z.object(
      Object.fromEntries(Object.keys(costLabels).map((k) => [k, money.nullable()])) as Record<
        CostKey,
        z.ZodNullable<typeof money>
      >,
    ),
    singleWidthMm: z.number().positive().max(5000),
    singleHeightMm: z.number().positive().max(5000),
    doubleWidthMm: z.number().positive().max(5000),
    doubleHeightMm: z.number().positive().max(5000),
    dimensionsConfirmed: z.boolean(),
    startCost: z.number().positive().max(10000000),
    floorCost: z.number().positive().max(10000000),
  })
  .refine(
    (v) => v.floorCost >= v.startCost * 3,
    "The 50% threshold must be at least three times the 73% threshold to keep prices increasing.",
  );
export type Catalog = z.infer<typeof catalogSchema>;
export const emptyCatalog: Catalog = {
  prices: Object.fromEntries(Object.keys(costLabels).map((k) => [k, null])) as Catalog["prices"],
  singleWidthMm: 500,
  singleHeightMm: 500,
  doubleWidthMm: 500,
  doubleHeightMm: 1000,
  dimensionsConfirmed: false,
  startCost: 5000,
  floorCost: 50000,
};
export const sectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  type: z.enum(["single", "double"]),
  wide: z.number().int().min(1).max(100),
  tall: z.number().int().min(1).max(100),
  quantity: z.number().int().min(1).max(100),
});
export const quoteSchema = z.object({
  title: z.string().trim().min(1).max(150),
  customer: z.string().max(150),
  leadId: z.string().uuid().nullable(),
  sections: z.array(sectionSchema).min(1).max(30),
  mount: z.enum(["ground", "hung"]),
  supports: count,
  clampsPerSupport: count,
  bars: count,
  slings: count,
  processor: z.enum(["vx1000", "vx600", "none"]),
  processors: count,
  cases: z.boolean(),
  spareSingles: count,
  spareDoubles: count,
  shipping: money,
  labor: money,
  travel: money,
  other: money,
  costsReviewed: z.boolean(),
  marginMode: z.enum(["scaled", "manual"]),
  manualMargin: z.number().min(50).max(73),
  taxPercent: z.number().min(0).max(30),
  notes: z.string().max(5000),
  terms: z.string().max(5000),
  catalog: catalogSchema,
});
export type QuoteInput = z.infer<typeof quoteSchema>;
export type WallSection = z.infer<typeof sectionSchema>;
export const quoteCopy = {
  title: "Build the right quote.",
  subtitle: "Plan the wall. Account for the whole package. Know your margin.",
  mountNotice:
    "Enter hardware quantities from your installation plan. This calculator estimates cost; it does not determine structural or rigging requirements.",
  scaleNote:
    "Suggested starting curve: 73% at $5,000 package cost or less, sliding smoothly to 50% at $50,000. Edit the cost thresholds in the cost book.",
  reviewNote:
    "Review shipping, installation, travel, and other job costs before sharing. Enter zero only when that cost is genuinely not needed.",
  dimensionsNote:
    "Panel dimensions start at 500 × 500 mm (single) and 500 × 1,000 mm (double). Confirm them against your actual cabinets in the cost book.",
};
export function newQuote(catalog: Catalog): QuoteInput {
  return {
    title: "New LED wall quote",
    customer: "",
    leadId: null,
    sections: [
      {
        id: crypto.randomUUID(),
        name: "Main wall",
        type: "single",
        wide: 12,
        tall: 6,
        quantity: 1,
      },
    ],
    mount: "ground",
    supports: 0,
    clampsPerSupport: 3,
    bars: 0,
    slings: 0,
    processor: "vx1000",
    processors: 1,
    cases: true,
    spareSingles: 0,
    spareDoubles: 0,
    shipping: 0,
    labor: 0,
    travel: 0,
    other: 0,
    costsReviewed: false,
    marginMode: "scaled",
    manualMargin: 60,
    taxPercent: 0,
    notes: "",
    terms:
      "Budgetary estimate. Final installation scope and mounting requirements subject to site review. Tax shown only if entered. Valid for 30 days.",
    catalog: structuredClone(catalog),
  };
}

export const wallVisualCopy = {
  title: "Your package at a glance",
  description:
    "Panel totals are single-panel equivalents: each double cabinet counts as two panels. Each rectangle shows one physical cabinet. All walls use the same scale.",
  empty: "Enter panel counts to preview your walls.",
  disclaimer:
    "Equipment illustrations are representative, not exact product drawings or an installation plan. Accessory sizes are not to scale. Walls are shown separately; spacing and height above the floor are not represented.",
};
