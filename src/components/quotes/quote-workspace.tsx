import { useEffect, useState } from "react";
import { Plus, Save, Copy, Printer, BookOpen, ArrowLeft, Trash2 } from "lucide-react";
import {
  catalogSchema,
  costLabels,
  emptyCatalog,
  newQuote,
  quoteCopy,
  type Catalog,
  type QuoteInput,
  type WallSection,
  type CostKey,
} from "@/config/quote-workspace";
import type { ChurchLead } from "@/config/command";
import {
  calculateQuote,
  customerQuote,
  dimensions,
  fitGrid,
  scaledMargin,
  usd,
} from "@/lib/quote-calculator";
import {
  loadQuoteWorkspace,
  saveCostCatalog,
  savePackageQuote,
  type SavedQuote,
  type SavedCatalog,
} from "@/lib/package-quote-api";
import "./quotes.css";

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 10000000,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      />
    </label>
  );
}
export function QuoteWorkspace({
  demo,
  role,
  leads,
}: {
  demo: boolean;
  role: string;
  leads: ChurchLead[];
}) {
  const [catalog, setCatalog] = useState<SavedCatalog | null>(null),
    [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [draft, setDraft] = useState<QuoteInput | null>(null),
    [saved, setSaved] = useState<SavedQuote | null>(null);
  const [costBook, setCostBook] = useState<Catalog | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!demo);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [storageReady, setStorageReady] = useState(demo),
    [dirty, setDirty] = useState(false);
  const edit = demo || ["owner", "admin", "sales"].includes(role),
    configure = demo || ["owner", "admin"].includes(role);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await loadQuoteWorkspace();
      setCatalog(r.catalog);
      setQuotes(r.quotes);
      setStorageReady(true);
    } catch (e) {
      setError((e as Error).message);
      setStorageReady(false);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!demo) void load();
  }, [demo]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(p: Partial<QuoteInput>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
    setNotice("");
  }
  function open(q?: SavedQuote) {
    if (dirty && !window.confirm("Discard unsaved quote changes?")) return;
    setSaved(q ?? null);
    setDraft(q ? structuredClone(q.payload) : newQuote(catalog?.data ?? emptyCatalog));
    setCostBook(null);
    setDirty(false);
    setError("");
    setNotice("");
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      calculateQuote(draft);
      const r = demo
        ? {
            id: saved?.id ?? crypto.randomUUID(),
            title: draft.title,
            payload: structuredClone(draft),
            revision: (saved?.revision ?? 0) + 1,
            updated_at: new Date().toISOString(),
          }
        : await savePackageQuote(draft, saved ?? undefined);
      setSaved(r);
      setQuotes((q) => [r, ...q.filter((x) => x.id !== r.id)]);
      setDirty(false);
      setNotice(
        demo
          ? "Saved for this demo session only."
          : "Draft saved privately. Nothing sent to the customer.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveBook() {
    if (!costBook) return;
    setBusy(true);
    setError("");
    try {
      const data = catalogSchema.parse(costBook);
      const r = demo
        ? { id: true, data, revision: 1 }
        : await saveCostCatalog(data, catalog?.revision);
      setCatalog(r);
      setCostBook(null);
      setNotice("Cost book saved. Existing quotes keep their own cost snapshot.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  let result: ReturnType<typeof calculateQuote> | null = null,
    validation = "";
  if (draft)
    try {
      result = calculateQuote(draft);
    } catch {
      validation =
        "Check the highlighted inputs: quantities must be whole numbers and costs cannot be negative. Margin must be 50–73%.";
    }
  async function copy() {
    try {
      await navigator.clipboard.writeText(customerQuote(draft!));
      setNotice("Customer quote copied. Purchase costs and margins are excluded.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function print() {
    try {
      const text = customerQuote(draft!);
      const escape = (s: string) =>
        s.replace(
          /[&<>"']/g,
          (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
        );
      const w = window.open("", "_blank");
      if (!w) throw new Error("Allow popups to open the print view.");
      w.document.write(
        `<!doctype html><html><head><title>Axis Displays quote</title><style>body{font:16px/1.6 Arial,sans-serif;max-width:760px;margin:60px auto;padding:24px;color:#142432}h1{font-size:28px}pre{white-space:pre-wrap;font:inherit}button{padding:12px}@media print{button{display:none}body{margin:0}}</style></head><body><h1>AXIS DISPLAYS</h1><pre>${escape(text)}</pre><button onclick="window.print()">Print / Save PDF</button></body></html>`,
      );
      w.document.close();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="qw">
      <div className="qw-toolbar">
        <div>
          <span className="cc-kicker">PRIVATE QUOTING</span>
          <p>
            {draft
              ? "Saved drafts keep a snapshot of their costs and margin settings."
              : "Create, revisit, and copy customer-ready estimates."}
          </p>
        </div>
        <div className="cc-actions">
          <button
            className="cc-outline"
            disabled={loading || busy}
            onClick={() => {
              if (dirty && !window.confirm("Discard unsaved quote changes?")) return;
              setDraft(null);
              setDirty(false);
              setCostBook(structuredClone(catalog?.data ?? emptyCatalog));
              setNotice("");
            }}
          >
            <BookOpen size={16} />
            Cost book
          </button>
          <button
            className="cc-primary"
            disabled={!edit || loading || busy || !storageReady}
            onClick={() => open()}
          >
            <Plus size={16} />
            New quote
          </button>
        </div>
      </div>
      {demo && (
        <p className="cc-notice">
          Demo only. Purchase costs start blank; entered values and drafts stay in this session.
        </p>
      )}
      {error && (
        <div className="cc-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="cc-notice" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p>Loading private quotes…</p>
      ) : !storageReady ? (
        <button className="cc-outline" onClick={() => void load()}>
          Retry quote connection
        </button>
      ) : null}
      {costBook ? (
        <div className="qw-card">
          <h2>Private cost book</h2>
          <p>
            USD purchase costs. A blank cost is unknown, not free. Changes apply to new quotes;
            existing drafts retain their saved prices.
          </p>
          <fieldset disabled={!configure || busy}>
            <div className="qw-fields qw-prices">
              {(Object.keys(costLabels) as CostKey[]).map((k) => (
                <label key={k}>
                  {costLabels[k]}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costBook.prices[k] ?? ""}
                    placeholder="Cost required"
                    onChange={(e) =>
                      setCostBook({
                        ...costBook,
                        prices: {
                          ...costBook.prices,
                          [k]: e.target.value === "" ? null : Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <p>
              Manufacturer-included panel power and data cables: included at no additional purchase
              cost.
            </p>
            <h3>Cabinet dimensions</h3>
            <p>{quoteCopy.dimensionsNote}</p>
            <div className="qw-fields">
              {(
                ["singleWidthMm", "singleHeightMm", "doubleWidthMm", "doubleHeightMm"] as const
              ).map((key, i) => (
                <NumberField
                  key={key}
                  label={
                    [
                      "Single width (mm)",
                      "Single height (mm)",
                      "Double width (mm)",
                      "Double height (mm)",
                    ][i]!
                  }
                  value={costBook[key]}
                  min={1}
                  max={5000}
                  onChange={(n) =>
                    setCostBook({ ...costBook, [key]: n, dimensionsConfirmed: false })
                  }
                />
              ))}
            </div>
            <label className="qw-check">
              <input
                type="checkbox"
                checked={costBook.dimensionsConfirmed}
                onChange={(e) =>
                  setCostBook({ ...costBook, dimensionsConfirmed: e.target.checked })
                }
              />
              Cabinet dimensions confirmed against our actual panels
            </label>
            <h3>Margin scaling</h3>
            <p>
              Price = total package cost ÷ (1 − gross margin). Start at 73%, gradually reduce to
              50%, and never go below 50%. The upper threshold must be at least three times the
              lower one so prices keep increasing.
            </p>
            <div className="qw-fields">
              <NumberField
                label="73% margin up to package cost ($)"
                value={costBook.startCost}
                min={1}
                onChange={(n) => setCostBook({ ...costBook, startCost: n })}
              />
              <NumberField
                label="50% margin at package cost ($)"
                value={costBook.floorCost}
                min={1}
                onChange={(n) => setCostBook({ ...costBook, floorCost: n })}
              />
            </div>
            <p>{quoteCopy.scaleNote}</p>
            <div className="qw-scale">
              {[5000, 10000, 20000, 50000].map((n) => (
                <span key={n}>
                  {usd(n)} cost
                  <b>
                    {catalogSchema.safeParse(costBook).success
                      ? `${scaledMargin(n, costBook.startCost, costBook.floorCost).toFixed(1)}%`
                      : "—"}
                  </b>
                </span>
              ))}
            </div>
            <button className="cc-primary" disabled={!storageReady} onClick={() => void saveBook()}>
              <Save size={16} />
              Save cost book
            </button>
          </fieldset>
          <button className="cc-outline" onClick={() => setCostBook(null)}>
            Back to quotes
          </button>
        </div>
      ) : draft ? (
        <>
          <div className="qw-toolbar">
            <button
              className="cc-outline"
              onClick={() => {
                if (dirty && !window.confirm("Discard unsaved quote changes?")) return;
                setDraft(null);
                setDirty(false);
              }}
            >
              <ArrowLeft size={16} />
              All quotes
            </button>
            <span>{dirty ? "Unsaved changes" : saved ? "Saved draft" : "New draft"}</span>
            <button
              className="cc-primary"
              disabled={!edit || busy || !result}
              onClick={() => void save()}
            >
              <Save size={16} />
              {busy ? "Saving…" : "Save draft"}
            </button>
          </div>
          <div className="qw-layout">
            <div className="qw-editor">
              <fieldset disabled={!edit || busy}>
                <div className="qw-card">
                  <h2>01 / Project</h2>
                  <div className="qw-fields">
                    <label>
                      Quote title
                      <input
                        value={draft.title}
                        maxLength={150}
                        onChange={(e) => change({ title: e.target.value })}
                      />
                    </label>
                    <label>
                      Customer or organization
                      <input
                        value={draft.customer}
                        maxLength={150}
                        onChange={(e) => change({ customer: e.target.value })}
                      />
                    </label>
                    <label>
                      Link an inquiry
                      <select
                        value={draft.leadId ?? ""}
                        onChange={(e) => {
                          const lead = leads.find((l) => l.id === e.target.value);
                          change({
                            leadId: lead?.id ?? null,
                            ...(lead
                              ? {
                                  customer:
                                    lead.church_name === "Not provided"
                                      ? lead.name
                                      : `${lead.church_name} — ${lead.name}`,
                                }
                              : {}),
                          });
                        }}
                      >
                        <option value="">No linked inquiry</option>
                        {leads
                          .filter((l) => !l.id.startsWith("demo"))
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name} · {l.church_name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="qw-card">
                  <h2>02 / Walls & columns</h2>
                  <p>
                    Enter cabinets across and high. Add a section for side walls or repeated
                    columns. Double cabinets are counted as whole double panels.
                  </p>
                  {draft.sections.map((s, i) => (
                    <SectionEditor
                      key={s.id}
                      section={s}
                      index={i}
                      catalog={draft.catalog}
                      onChange={(next) =>
                        change({
                          sections: draft.sections.map((x) => (x.id === s.id ? next : x)),
                          costsReviewed: false,
                        })
                      }
                      remove={
                        draft.sections.length > 1
                          ? () =>
                              change({
                                sections: draft.sections.filter((x) => x.id !== s.id),
                                costsReviewed: false,
                              })
                          : undefined
                      }
                    />
                  ))}
                  <button
                    className="cc-outline"
                    disabled={draft.sections.length >= 30}
                    onClick={() =>
                      change({
                        sections: [
                          ...draft.sections,
                          {
                            id: crypto.randomUUID(),
                            name: "Side columns",
                            type: "single",
                            wide: 1,
                            tall: 4,
                            quantity: 2,
                          },
                        ],
                        costsReviewed: false,
                      })
                    }
                  >
                    <Plus size={16} />
                    Add wall / columns
                  </button>
                </div>
                <div className="qw-card">
                  <h2>03 / Mounting</h2>
                  <div className="qw-fields">
                    <label>
                      Installation type
                      <select
                        value={draft.mount}
                        onChange={(e) =>
                          change({
                            mount: e.target.value as QuoteInput["mount"],
                            costsReviewed: false,
                          })
                        }
                      >
                        <option value="ground">Ground-stacked</option>
                        <option value="hung">Hung</option>
                      </select>
                    </label>
                    {draft.mount === "ground" ? (
                      <>
                        <NumberField
                          label="Base plate + truss supports"
                          value={draft.supports}
                          onChange={(n) => change({ supports: n, costsReviewed: false })}
                        />
                        <NumberField
                          label="Clamps per support"
                          value={draft.clampsPerSupport}
                          onChange={(n) => change({ clampsPerSupport: n, costsReviewed: false })}
                        />
                      </>
                    ) : (
                      <>
                        <NumberField
                          label="Hanging bars"
                          value={draft.bars}
                          onChange={(n) => change({ bars: n, costsReviewed: false })}
                        />
                        <NumberField
                          label="SpanSet slings"
                          value={draft.slings}
                          onChange={(n) => change({ slings: n, costsReviewed: false })}
                        />
                      </>
                    )}
                  </div>
                  {draft.mount === "ground" && (
                    <p>
                      {draft.supports || 0} base plates + {draft.supports || 0} truss sections +{" "}
                      {draft.supports * draft.clampsPerSupport || 0} clamps. Quantities cover all
                      sections combined.
                    </p>
                  )}
                  <p className="qw-note">{quoteCopy.mountNotice}</p>
                </div>
                <div className="qw-card">
                  <h2>04 / Equipment & job costs</h2>
                  <div className="qw-fields">
                    <label>
                      Processor
                      <select
                        value={draft.processor}
                        onChange={(e) =>
                          change({
                            processor: e.target.value as QuoteInput["processor"],
                            costsReviewed: false,
                          })
                        }
                      >
                        <option value="vx1000">NovaStar VX1000 Pro</option>
                        <option value="vx600">NovaStar VX600</option>
                        <option value="none">Not included</option>
                      </select>
                    </label>
                    <NumberField
                      label="Processor quantity"
                      value={draft.processors}
                      onChange={(n) => change({ processors: n, costsReviewed: false })}
                    />
                    <NumberField
                      label="Spare single panels"
                      value={draft.spareSingles}
                      onChange={(n) => change({ spareSingles: n, costsReviewed: false })}
                    />
                    <NumberField
                      label="Spare double panels"
                      value={draft.spareDoubles}
                      onChange={(n) => change({ spareDoubles: n, costsReviewed: false })}
                    />
                  </div>
                  <label className="qw-check">
                    <input
                      type="checkbox"
                      checked={draft.cases}
                      onChange={(e) => change({ cases: e.target.checked, costsReviewed: false })}
                    />
                    Include flight cases (round up: 8 singles or 6 doubles per case)
                  </label>
                  <p>Check processor capacity separately for the final pixel layout.</p>
                  <div className="qw-fields">
                    {(["shipping", "labor", "travel", "other"] as const).map((k, i) => (
                      <NumberField
                        key={k}
                        label={
                          [
                            "Shipping cost ($)",
                            "Installation labor cost ($)",
                            "Travel cost ($)",
                            "Other job costs ($)",
                          ][i]!
                        }
                        value={draft[k]}
                        step="0.01"
                        onChange={(n) => change({ [k]: n, costsReviewed: false })}
                      />
                    ))}
                  </div>
                  <p>{quoteCopy.reviewNote}</p>
                  <label className="qw-check">
                    <input
                      type="checkbox"
                      checked={draft.costsReviewed}
                      onChange={(e) => change({ costsReviewed: e.target.checked })}
                    />
                    I reviewed all package costs, including any zero amounts
                  </label>
                </div>
                <div className="qw-card">
                  <h2>05 / Pricing & notes</h2>
                  <div className="qw-fields">
                    <label>
                      Margin method
                      <select
                        value={draft.marginMode}
                        onChange={(e) =>
                          change({ marginMode: e.target.value as QuoteInput["marginMode"] })
                        }
                      >
                        <option value="scaled">Scale with package cost</option>
                        <option value="manual">Choose margin manually</option>
                      </select>
                    </label>
                    {draft.marginMode === "manual" && (
                      <NumberField
                        label="Gross margin (%)"
                        value={draft.manualMargin}
                        min={50}
                        max={73}
                        step="0.1"
                        onChange={(n) => change({ manualMargin: n })}
                      />
                    )}
                    <NumberField
                      label="Sales tax (%) — confirm separately"
                      value={draft.taxPercent}
                      min={0}
                      max={30}
                      step="0.01"
                      onChange={(n) => change({ taxPercent: n })}
                    />
                  </div>
                  <label>
                    Internal notes (never included in customer copy)
                    <textarea
                      rows={3}
                      maxLength={5000}
                      value={draft.notes}
                      onChange={(e) => change({ notes: e.target.value })}
                    />
                  </label>
                  <label>
                    Customer terms / scope
                    <textarea
                      rows={4}
                      maxLength={5000}
                      value={draft.terms}
                      onChange={(e) => change({ terms: e.target.value })}
                    />
                  </label>
                  <button
                    className="cc-outline"
                    disabled={!catalog}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Replace this draft’s cost snapshot with the current cost book?",
                        )
                      )
                        change({ catalog: structuredClone(catalog!.data), costsReviewed: false });
                    }}
                  >
                    Apply current cost book
                  </button>
                </div>
              </fieldset>
            </div>
            <aside className="qw-summary">
              <span className="cc-kicker">PACKAGE ESTIMATE</span>
              {result ? (
                <>
                  <strong className="qw-total">
                    {result.missing.length ? "Costs missing" : usd(result.totalCents / 100)}
                  </strong>
                  <p>Customer total · {result.singles + result.doubles} panels including spares</p>
                  <dl>
                    <div>
                      <dt>Package cost</dt>
                      <dd>{usd(result.costCents / 100)}</dd>
                    </div>
                    <div>
                      <dt>Gross margin</dt>
                      <dd>{result.margin.toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt>Gross profit</dt>
                      <dd>{usd(result.profitCents / 100)}</dd>
                    </div>
                    <div>
                      <dt>Before tax</dt>
                      <dd>{usd(result.priceCents / 100)}</dd>
                    </div>
                    <div>
                      <dt>Sales tax</dt>
                      <dd>{usd(result.taxCents / 100)}</dd>
                    </div>
                  </dl>
                  <p className="qw-note">
                    Gross profit is before business overhead and income taxes. All entered job costs
                    receive the package margin.
                  </p>
                  <details>
                    <summary>Internal cost breakdown</summary>
                    {result.lines.map((l, i) => (
                      <div className="qw-cost-line" key={i}>
                        <span>
                          {l.label}
                          <small>
                            {l.quantity} × {usd(l.unitCents / 100)}
                          </small>
                        </span>
                        <b>{usd(l.totalCents / 100)}</b>
                      </div>
                    ))}
                  </details>
                  {result.warnings.length > 0 && (
                    <div className="qw-checks">
                      <b>Before sharing</b>
                      <ul>
                        {result.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    className="cc-primary"
                    disabled={result.warnings.length > 0}
                    onClick={() => void copy()}
                  >
                    <Copy size={16} />
                    Copy customer quote
                  </button>
                  <button
                    className="cc-outline"
                    disabled={result.warnings.length > 0}
                    onClick={print}
                  >
                    <Printer size={16} />
                    Print / PDF
                  </button>
                  {!result.warnings.length && (
                    <details>
                      <summary>Customer preview</summary>
                      <pre>{customerQuote(draft)}</pre>
                    </details>
                  )}
                </>
              ) : (
                <p role="alert">{validation}</p>
              )}
            </aside>
          </div>
        </>
      ) : !costBook && !loading && storageReady ? (
        <div className="qw-card">
          <h2>Saved quotes</h2>
          {quotes.length ? (
            quotes.map((q) => (
              <button className="qw-saved" key={q.id} onClick={() => open(q)}>
                <span>
                  <b>{q.title}</b>
                  <small>
                    {q.payload.customer || "No customer yet"} ·{" "}
                    {new Date(q.updated_at).toLocaleDateString()}
                  </small>
                </span>
                <span>Open →</span>
              </button>
            ))
          ) : (
            <p>No quotes yet. Set up your cost book, then build your first package.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
function SectionEditor({
  section: s,
  index,
  catalog,
  onChange,
  remove,
}: {
  section: WallSection;
  index: number;
  catalog: Catalog;
  onChange: (s: WallSection) => void;
  remove?: (() => void) | undefined;
}) {
  const [targetW, setTargetW] = useState(20),
    [targetH, setTargetH] = useState(11.25),
    [error, setError] = useState("");
  const d = dimensions(s, catalog);
  return (
    <div className="qw-section">
      <div className="qw-section-head">
        <b>SECTION {index + 1}</b>
        {remove && (
          <button aria-label={`Remove ${s.name}`} onClick={remove}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div className="qw-fields">
        <label>
          Section name
          <input
            value={s.name}
            maxLength={100}
            onChange={(e) => onChange({ ...s, name: e.target.value })}
          />
        </label>
        <label>
          Panel format
          <select
            value={s.type}
            onChange={(e) => onChange({ ...s, type: e.target.value as WallSection["type"] })}
          >
            <option value="single">Single · 2.6mm</option>
            <option value="double">Double · 2.6mm</option>
          </select>
        </label>
        <NumberField
          label="Panels wide"
          value={s.wide}
          min={1}
          max={100}
          onChange={(n) => onChange({ ...s, wide: n })}
        />
        <NumberField
          label="Panels tall"
          value={s.tall}
          min={1}
          max={100}
          onChange={(n) => onChange({ ...s, tall: n })}
        />
        <NumberField
          label="Number of identical walls / columns"
          value={s.quantity}
          min={1}
          max={100}
          onChange={(n) => onChange({ ...s, quantity: n })}
        />
      </div>
      <div className="qw-dimensions">
        <strong>
          {Number.isFinite(d.widthFt) ? d.widthFt.toFixed(2) : "—"} ×{" "}
          {Number.isFinite(d.heightFt) ? d.heightFt.toFixed(2) : "—"} ft
        </strong>
        <span>
          per wall · {s.wide * s.tall * s.quantity || 0} panels total ·{" "}
          {Number.isFinite(d.ratio) ? d.ratio.toFixed(3) : "—"}:1 aspect ratio
        </span>
      </div>
      <details>
        <summary>Start from target dimensions</summary>
        <div className="qw-fields">
          <NumberField
            label="Target width (ft)"
            value={targetW}
            step="0.01"
            min={0.01}
            onChange={setTargetW}
          />
          <NumberField
            label="Target height (ft)"
            value={targetH}
            step="0.01"
            min={0.01}
            onChange={setTargetH}
          />
        </div>
        <button
          className="cc-outline"
          onClick={() => {
            try {
              onChange({ ...s, ...fitGrid(targetW, targetH, s.type, catalog) });
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Use nearest whole-panel layout
        </button>
        <p>
          Rounds each dimension to whole cabinets. The result may be larger or smaller than the
          target and may not be exactly 16:9.
        </p>
        {error && <p role="alert">{error}</p>}
      </details>
    </div>
  );
}
