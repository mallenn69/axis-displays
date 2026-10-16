import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WallVisualizer } from "@/components/quotes/wall-visualizer";
import visualStyles from "@/components/quotes/wall-visualizer.css?raw";
import { type QuoteInput, costLabels } from "@/config/quote-workspace";
import {
  calculateQuote,
  customerQuote,
  dimensions,
  singlePanelCount,
  usd,
} from "./quote-calculator";
import logo from "@/assets/axis-displays-logo.png";
import styles from "@/components/quotes/quote-document.css?raw";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );

/** Customer-only document: never serialize the quote payload or its cost book. */
export function quoteDocument(q: QuoteInput) {
  customerQuote(q); // Preserve the same completion checks as the text export.
  const r = calculateQuote(q);
  const included = [
    q.mount === "ground"
      ? "Ground-stacked setup · subject to site review"
      : "Hung setup · subject to site review",
    q.processor === "none"
      ? "Processor not included"
      : `${costLabels[q.processor]} × ${q.processors}`,
    q.cases ? "Flight cases included" : "Flight cases not included",
    ...(q.spareSingles || q.spareDoubles
      ? [`Spare panels: ${q.spareSingles + q.spareDoubles * 2} single-panel equivalents`]
      : []),
    "Standard panel power and data cables included",
    q.labor > 0 ? "Installation labor included" : "Installation labor not priced in this estimate",
    q.shipping > 0 ? "Shipping included" : "Shipping not priced in this estimate",
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(q.title)} | Axis Displays</title><style>${styles}
${visualStyles}</style></head><body>
  <nav class="print-tools"><span>Your Axis Displays quote</span><button onclick="window.print()">Print / Save PDF</button></nav>
  <main class="quote-sheet">
    <header class="brand"><img src="${escape(logo)}" alt="Axis Displays"><span>AXISLEDWALLS.COM</span></header>
    <section class="intro"><p class="eyebrow">YOUR LED WALL • PROJECT ESTIMATE</p><h1>${escape(q.title)}</h1>${q.customer ? `<p class="prepared">Prepared for <strong>${escape(q.customer)}</strong></p>` : ""}</section>
    <section class="section"><h2>Your wall configuration</h2><div class="walls">${q.sections
      .map((s) => {
        const d = dimensions(s, q.catalog);
        return `<article class="wall"><div><h3>${escape(s.name)}</h3><p>${s.quantity} ${s.quantity === 1 ? "wall" : "walls"} · 2.6mm pixel pitch</p></div><div class="size"><strong>${d.widthFt.toFixed(2)} × ${d.heightFt.toFixed(2)} <small>ft</small></strong><p>${singlePanelCount(s)} panels total · single-panel equivalents</p></div></article>`;
      })
      .join("")}</div></section>
    <section class="section">${renderToStaticMarkup(createElement(WallVisualizer, { sections: q.sections, catalog: q.catalog, quote: q }))}</section>
    <section class="section"><h2>Package details</h2><ul class="included">${included.map((line) => `<li>${escape(line)}</li>`).join("")}</ul></section>
    <section class="pricing"><div><p class="eyebrow">YOUR PROJECT</p><h2>Package estimate</h2><p>All amounts in USD</p></div><dl><div><dt>Package price</dt><dd>${usd(r.priceCents / 100)}</dd></div><div><dt>Tax (${q.taxPercent}%)</dt><dd>${usd(r.taxCents / 100)}</dd></div><div class="total"><dt>Total</dt><dd>${usd(r.totalCents / 100)}</dd></div></dl></section>
    ${q.terms.trim() ? `<section class="section terms"><h2>Project notes & terms</h2><p>${escape(q.terms)}</p></section>` : ""}
    <footer><strong>AXIS DISPLAYS</strong><a href="https://axisledwalls.com">axisledwalls.com</a></footer>
  </main></body></html>`;
}
