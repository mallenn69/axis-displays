import {
  costLabels,
  quoteSchema,
  type Catalog,
  type CostKey,
  type QuoteInput,
  type WallSection,
} from "@/config/quote-workspace";
export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
export function dimensions(s: WallSection, c: Catalog) {
  const width = s.wide * (s.type === "single" ? c.singleWidthMm : c.doubleWidthMm);
  const height = s.tall * (s.type === "single" ? c.singleHeightMm : c.doubleHeightMm);
  return {
    widthMm: width,
    heightMm: height,
    widthFt: width / 304.8,
    heightFt: height / 304.8,
    ratio: width / height,
  };
}
export function fitGrid(widthFt: number, heightFt: number, type: WallSection["type"], c: Catalog) {
  if (!Number.isFinite(widthFt) || !Number.isFinite(heightFt) || widthFt <= 0 || heightFt <= 0)
    throw new Error("Enter a positive width and height.");
  const wide = Math.max(
    1,
    Math.round((widthFt * 304.8) / (type === "single" ? c.singleWidthMm : c.doubleWidthMm)),
  );
  const tall = Math.max(
    1,
    Math.round((heightFt * 304.8) / (type === "single" ? c.singleHeightMm : c.doubleHeightMm)),
  );
  if (wide > 100 || tall > 100) throw new Error("This size exceeds the 100 × 100 panel limit.");
  return { wide, tall };
}
// Log interpolation avoids downward price jumps when cost crosses a threshold.
export function scaledMargin(cost: number, start: number, end: number) {
  if (start <= 0 || end < start * 3) throw new Error("Invalid margin thresholds.");
  const progress = Math.max(
    0,
    Math.min(1, Math.log(Math.max(cost, start) / start) / Math.log(end / start)),
  );
  return 73 - 23 * progress;
}
export function calculateQuote(input: QuoteInput) {
  const q = quoteSchema.parse(input),
    c = q.catalog;
  const singles =
    q.sections
      .filter((s) => s.type === "single")
      .reduce((n, s) => n + s.wide * s.tall * s.quantity, 0) + q.spareSingles;
  const doubles =
    q.sections
      .filter((s) => s.type === "double")
      .reduce((n, s) => n + s.wide * s.tall * s.quantity, 0) + q.spareDoubles;
  const lines: { label: string; quantity: number; unitCents: number; totalCents: number }[] = [];
  const missing: string[] = [];
  function add(key: CostKey, quantity: number) {
    if (!quantity) return;
    const price = c.prices[key];
    if (price === null) missing.push(costLabels[key]);
    const unitCents = Math.round((price ?? 0) * 100);
    lines.push({ label: costLabels[key], quantity, unitCents, totalCents: unitCents * quantity });
  }
  add("single", singles);
  add("double", doubles);
  if (q.processor !== "none") add(q.processor, q.processors);
  if (q.cases) {
    add("singleCase", Math.ceil(singles / 8));
    add("doubleCase", Math.ceil(doubles / 6));
  }
  if (q.mount === "ground") {
    add("base", q.supports);
    add("truss", q.supports);
    add("clamp", q.supports * q.clampsPerSupport);
  } else {
    add("bar", q.bars);
    add("sling", q.slings);
  }
  for (const [label, value] of [
    ["Shipping", q.shipping],
    ["Installation labor", q.labor],
    ["Travel", q.travel],
    ["Other job costs", q.other],
  ] as const) {
    if (value)
      lines.push({
        label,
        quantity: 1,
        unitCents: Math.round(value * 100),
        totalCents: Math.round(value * 100),
      });
  }
  const costCents = lines.reduce((n, l) => n + l.totalCents, 0);
  const margin =
    q.marginMode === "manual"
      ? q.manualMargin
      : scaledMargin(costCents / 100, c.startCost, c.floorCost);
  // Ceiling ensures rounding cannot put realized gross margin below its target.
  const priceCents = Math.ceil(costCents / (1 - margin / 100));
  const taxCents = Math.round((priceCents * q.taxPercent) / 100);
  const warnings = [...missing.map((s) => `Missing purchase cost: ${s}`)];
  if (!c.dimensionsConfirmed) warnings.push("Confirm cabinet dimensions in the cost book.");
  if (!q.costsReviewed) warnings.push("Review and confirm all job costs.");
  if (q.mount === "ground" && !q.supports) warnings.push("Enter the number of ground supports.");
  if (q.mount === "hung" && (!q.bars || !q.slings))
    warnings.push("Enter hanging bar and sling quantities from your rigging plan.");
  if (q.processor !== "none" && !q.processors) warnings.push("Enter a processor quantity.");
  return {
    lines,
    singles,
    doubles,
    missing,
    warnings,
    costCents,
    margin,
    priceCents,
    taxCents,
    totalCents: priceCents + taxCents,
    profitCents: priceCents - costCents,
  };
}
export function customerQuote(q: QuoteInput) {
  const r = calculateQuote(q);
  if (r.warnings.length) throw new Error("Finish the quote checks before exporting.");
  return [
    `AXIS DISPLAYS — ${q.title}`,
    q.customer ? `Prepared for ${q.customer}` : "",
    "",
    ...q.sections.map((s) => {
      const d = dimensions(s, q.catalog);
      return `${s.name}${s.quantity > 1 ? ` (${s.quantity} walls)` : ""}: ${d.widthFt.toFixed(2)} × ${d.heightFt.toFixed(2)} ft per wall · ${s.wide} wide × ${s.tall} tall ${s.type} panels · 2.6mm`;
    }),
    "",
    `Mounting: ${q.mount === "ground" ? "Ground-stacked" : "Hung"} (subject to site review)`,
    q.processor === "none"
      ? "Processor not included"
      : `${costLabels[q.processor]} × ${q.processors}`,
    q.cases ? "Flight cases included" : "Flight cases not included",
    q.spareSingles || q.spareDoubles
      ? `Spare panels: ${q.spareSingles} single, ${q.spareDoubles} double`
      : "",
    "Standard panel power and data cables included.",
    q.labor > 0
      ? "Installation labor included."
      : "Installation labor not priced in this estimate.",
    q.shipping > 0 ? "Shipping included." : "Shipping not priced in this estimate.",
    "",
    `Package price: ${usd(r.priceCents / 100)}`,
    `Tax (${q.taxPercent}%): ${usd(r.taxCents / 100)}`,
    `Total: ${usd(r.totalCents / 100)}`,
    "",
    q.terms,
  ]
    .filter((v) => v !== undefined)
    .join("\n");
}
