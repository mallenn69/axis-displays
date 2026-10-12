import { startPixel } from "@/lib/meta-pixel";
import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowLeft, Plus, Minus, Play, Pause, Check } from "lucide-react";
import logo from "@/assets/axis-displays-logo.png";
import {
  studioCopy,
  simpleDefault,
  simpleSections,
  defaultDesign,
  countPanels,
  screenFeet,
  type SimpleLayout,
  type StudioDesign,
} from "@/config/studio";
import { QuoteDialog } from "./studio-quote";
import "./studio.css";
const visuals = [
  { id: "motion", name: "Blue flow" },
  { id: "aurora", name: "Aurora" },
  { id: "sunset", name: "Warm glow" },
  { id: "ice", name: "Ice" },
] as const;
function Size({
  label,
  value,
  max = 20,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="simple-size">
      <span>{label}</span>
      <div>
        <button
          aria-label={`Decrease ${label}`}
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={16} />
        </button>
        <output>{value}</output>
        <button
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button className="simple-toggle" role="switch" aria-checked={checked} onClick={onChange}>
      <span>{label}</span>
      <i>
        <b />
      </i>
    </button>
  );
}
function Preview({
  design,
  visual,
  paused,
}: {
  design: StudioDesign;
  visual: string;
  paused: boolean;
}) {
  const sections = design.sections;
  let extent = Math.max(7, ...sections.map((s) => 2 * (Math.abs(s.x) + s.cols * 0.25 + 1)));
  let height = Math.max(4, ...sections.map((s) => s.y + s.rows * 0.25));
  let scale = Math.min(800 / extent, 390 / height);
  return (
    <svg
      className={`simple-stage ${paused ? "sd-paused" : ""}`}
      viewBox="0 0 1000 600"
      role="img"
      aria-label="Your LED wall layout with optional side columns and overhead panels"
    >
      <defs>
        <pattern id="simple-dots" width="25" height="25" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".8" fill="#2b3944" />
        </pattern>
        <linearGradient id="simple-fill" x2="1" y2="1">
          <stop
            stopColor={
              visual === "sunset" ? "#4c2459" : visual === "aurora" ? "#294877" : "#07364f"
            }
          />
          <stop
            offset=".55"
            stopColor={
              visual === "sunset"
                ? "#c96c55"
                : visual === "aurora"
                  ? "#4c998e"
                  : visual === "ice"
                    ? "#81c8dc"
                    : "#167cbb"
            }
          />
          <stop offset="1" stopColor="#112a43" />
        </linearGradient>
        <pattern
          id="simple-grid"
          width={scale * 0.5}
          height={scale * 0.5}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M${scale * 0.5} 0H0V${scale * 0.5}`}
            fill="none"
            stroke="#071c2c"
            strokeWidth="1"
            opacity=".45"
          />
        </pattern>
      </defs>
      <rect width="1000" height="600" fill="url(#simple-dots)" />
      <path d="M70 525H930" stroke="#344652" />
      {sections.map((s, i) => {
        const w = s.cols * scale * 0.5,
          h = s.rows * scale * 0.5,
          over = s.kind === "overhead",
          sy = over ? Math.max(0.35, Math.cos((Math.abs(s.tilt) * Math.PI) / 180)) : 1;
        return (
          <g
            key={s.id}
            transform={`translate(${500 + s.x * scale},${500 - s.y * scale}) skewX(${over ? -s.tilt * 0.2 : 0}) scale(1,${sy})`}
          >
            <defs>
              <clipPath id={`simple-clip-${i}`}>
                <rect x={-w / 2} y={-h / 2} width={w} height={h} />
              </clipPath>
            </defs>
            <g clipPath={`url(#simple-clip-${i})`}>
              <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="url(#simple-fill)" />
              <g className="sd-ribbon">
                <path
                  d={`M${-w} ${h * 0.3}Q0 ${-h * 0.6} ${w} ${h * 0.05}`}
                  fill="none"
                  stroke={visual === "sunset" ? "#ffd1b3" : "#b1efff"}
                  strokeWidth={h * 0.22}
                  opacity=".2"
                />
                <path
                  d={`M${-w} ${h * 0.3}Q0 ${-h * 0.6} ${w} ${h * 0.05}`}
                  fill="none"
                  stroke="#e5f9ff"
                  strokeWidth={h * 0.017}
                  opacity=".6"
                />
              </g>
              <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="url(#simple-grid)" />
            </g>
            <rect
              x={-w / 2}
              y={-h / 2}
              width={w}
              height={h}
              fill="none"
              stroke="#83b7d0"
              strokeWidth="1.2"
            />
          </g>
        );
      })}
    </svg>
  );
}
export function StageDesigner() {
  useEffect(() => { startPixel(); }, []);
  const [layout, setLayout] = useState<SimpleLayout>(simpleDefault),
    [final, setFinal] = useState(false),
    [visual, setVisual] = useState<StudioDesign["content"]>("motion"),
    [paused, setPaused] = useState(false),
    [quote, setQuote] = useState(false);
  const patch = (p: Partial<SimpleLayout>) => setLayout((s) => ({ ...s, ...p }));
  useEffect(() => setPaused(matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  const design: StudioDesign = {
    ...defaultDesign,
    sections: simpleSections(layout),
    content: visual,
    headline: "",
    subline: "",
  };
  return (
    <main className="sd-app simple-app">
      <header className="sd-header">
        <a href="/" aria-label="Axis Displays home">
          <img src={logo} alt="Axis Displays" />
        </a>
        <span className="sd-header-title">WALL DESIGNER</span>
        <a href="/" className="sd-exit">
          Back to site <ArrowUpRight size={15} />
        </a>
      </header>
      <section className="sd-intro">
        <div>
          <span className="sd-eyebrow">
            {final ? "02 / MAKE IT YOURS" : "01 / BUILD YOUR WALL"}
          </span>
          <h1>{final ? "See it come together." : studioCopy.builderTitle}</h1>
          <p>
            {final
              ? studioCopy.graphicsIntro
              : studioCopy.builderIntro}
          </p>
        </div>
      </section>
      <div className="sd-workspace simple-workspace">
        <aside className="sd-editor">
          <div className="simple-controls">
            {!final ? (
              <>
                <h2>Center wall</h2>
                <div className="simple-sizes">
                  <Size label="Width" value={layout.cols} onChange={(cols) => patch({ cols })} />
                  <Size
                    label="Height"
                    value={layout.rows}
                    max={10}
                    onChange={(rows) => patch({ rows })}
                  />
                </div>
                <p className="simple-dims">
                  {screenFeet(layout.cols)} × {screenFeet(layout.rows)} ft ·{" "}
                  {layout.cols * layout.rows} panels
                </p>
                <div className="sd-rule" />
                <Toggle
                  label="Add side columns"
                  checked={layout.sides}
                  onChange={() => patch({ sides: !layout.sides })}
                />
                {layout.sides && (
                  <div className="simple-extra">
                    <div className="simple-sizes">
                      <Size
                        label="Column width"
                        value={layout.sideCols}
                        max={4}
                        onChange={(sideCols) => patch({ sideCols })}
                      />
                      <Size
                        label="Column height"
                        value={layout.sideRows}
                        max={10}
                        onChange={(sideRows) => patch({ sideRows })}
                      />
                    </div>
                    <p>One matching section on each side.</p>
                    <label className="sd-range">
                      <span>
                        Spacing<output>{layout.gap.toFixed(1)} m</output>
                      </span>
                      <input
                        aria-label="Side column spacing"
                        type="range"
                        min=".5"
                        max="3"
                        step=".1"
                        value={layout.gap}
                        onChange={(e) => patch({ gap: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                )}
                <div className="sd-rule" />
                <Toggle
                  label="Add overhead panels"
                  checked={layout.overhead}
                  onChange={() => patch({ overhead: !layout.overhead })}
                />
                {layout.overhead && (
                  <div className="simple-extra">
                    <Size
                      label="Overhead sections"
                      value={layout.overCount}
                      max={5}
                      onChange={(overCount) => patch({ overCount })}
                    />
                    <div className="simple-sizes">
                      <Size
                        label="Overhead width"
                        value={layout.overCols}
                        max={4}
                        onChange={(overCols) => patch({ overCols })}
                      />
                      <Size
                        label="Overhead length"
                        value={layout.overRows}
                        max={6}
                        onChange={(overRows) => patch({ overRows })}
                      />
                    </div>
                    <label className="sd-range">
                      <span>
                        Tilt<output>{layout.tilt}°</output>
                      </span>
                      <input
                        aria-label="Overhead tilt"
                        type="range"
                        min="15"
                        max="75"
                        step="5"
                        value={layout.tilt}
                        onChange={(e) => patch({ tilt: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                )}
                <button className="sd-primary simple-final" onClick={() => setFinal(true)}>
                  Finalize <ArrowUpRight size={18} />
                </button>
              </>
            ) : (
              <>
                <button className="simple-back" onClick={() => setFinal(false)}>
                  <ArrowLeft size={15} /> Edit layout
                </button>
                <h2>{studioCopy.graphicsTitle}</h2>
                <p className="simple-note">{studioCopy.graphicsNote}</p>
                <div className="simple-visuals">
                  {visuals.map((v) => (
                    <button
                      key={v.id}
                      aria-pressed={visual === v.id}
                      onClick={() => setVisual(v.id)}
                    >
                      <span className={`simple-swatch ${v.id}`} />
                      <span>{v.name}</span>
                      {visual === v.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
                <button className="sd-primary simple-final" onClick={() => setQuote(true)}>
                  Get my quote <ArrowUpRight size={18} />
                </button>
                <p className="simple-note">We’ll quote both panel options for this layout.</p>
              </>
            )}
          </div>
        </aside>
        <section className="sd-preview" aria-label="Wall preview">
          <div className="sd-preview-toolbar">
            <span>YOUR WALL</span>
            <button
              className="simple-play"
              onClick={() => setPaused(!paused)}
              aria-label={paused ? "Play preview" : "Pause preview"}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? "Play" : "Pause"}
            </button>
          </div>
          <Preview design={design} visual={visual} paused={paused} />
          <div className="sd-preview-bottom">
            <span>{countPanels(design)} panels total</span>
            <span>Layout preview</span>
          </div>
        </section>
      </div>
      <p className="sd-disclaimer simple-disclaimer">
        Approximate dimensions. We’ll confirm the fit and mounting with you.
      </p>
      {quote && <QuoteDialog design={design} onClose={() => setQuote(false)} />}
    </main>
  );
}
