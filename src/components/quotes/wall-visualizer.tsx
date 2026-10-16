import { PackageEquipment } from "./package-equipment";
import { type Catalog, type WallSection, type QuoteInput } from "@/config/quote-workspace";
import { dimensions } from "@/lib/quote-calculator";
import { wallVisualCopy } from "@/config/quote-workspace";
import "./wall-visualizer.css";

export function WallVisualizer({
  sections,
  catalog,
  quote,
}: {
  sections: WallSection[];
  catalog: Catalog;
  quote?: QuoteInput;
}) {
  const valid = sections.filter(
    (s) =>
      Number.isInteger(s.wide) &&
      s.wide > 0 &&
      s.wide <= 100 &&
      Number.isInteger(s.tall) &&
      s.tall > 0 &&
      s.tall <= 100 &&
      Number.isInteger(s.quantity) &&
      s.quantity > 0 &&
      s.quantity <= 100,
  );
  const sizes = valid.map((s) => dimensions(s, catalog));
  const maxWidth = Math.max(1, ...sizes.map((d) => d.widthMm));
  const maxHeight = Math.max(1, ...sizes.map((d) => d.heightMm));
  const scale = Math.min(250 / maxWidth, 175 / maxHeight);
  return (
    <section className="wall-visualizer" aria-label={wallVisualCopy.title}>
      <h2>{wallVisualCopy.title}</h2>
      <p className="wv-note">{wallVisualCopy.description}</p>
      {!valid.length && <p>{wallVisualCopy.empty}</p>}
      <div className={quote ? "wv-package" : undefined}>
        <div>
          {valid.map((s, index) => {
            const d = sizes[index];
            const width = d.widthMm * scale,
              height = d.heightMm * scale;
            const x = (320 - width) / 2,
              y = 205 - height;
            return (
              <section className="wv-group" key={s.id}>
                <h3>
                  {s.name}{" "}
                  <span>
                    · {s.quantity} {s.quantity === 1 ? "wall" : "walls"} ·{" "}
                    {s.wide * s.tall * s.quantity} panels total
                  </span>
                </h3>
                <p className="wv-spec">
                  {d.widthFt.toFixed(2)} × {d.heightFt.toFixed(2)} ft each · {s.wide} wide ×{" "}
                  {s.tall} tall · {s.type} panels
                </p>
                <div className="wv-grid">
                  {Array.from({ length: s.quantity }, (_, instance) => (
                    <figure key={instance}>
                      <svg
                        viewBox="0 0 320 250"
                        role="img"
                        aria-label={`${s.name} ${instance + 1}: ${s.wide} by ${s.tall} ${s.type} panels, ${d.widthFt.toFixed(2)} by ${d.heightFt.toFixed(2)} feet`}
                      >
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill="#164b58"
                          stroke="#0b303b"
                          strokeWidth="1.5"
                        />
                        {Array.from({ length: s.wide - 1 }, (_, i) => (
                          <line
                            key={`v${i}`}
                            x1={x + ((i + 1) * width) / s.wide}
                            x2={x + ((i + 1) * width) / s.wide}
                            y1={y}
                            y2={205}
                            stroke="#74d9cf"
                            strokeWidth="0.6"
                          />
                        ))}
                        {Array.from({ length: s.tall - 1 }, (_, i) => (
                          <line
                            key={`h${i}`}
                            x1={x}
                            x2={x + width}
                            y1={y + ((i + 1) * height) / s.tall}
                            y2={y + ((i + 1) * height) / s.tall}
                            stroke="#74d9cf"
                            strokeWidth="0.6"
                          />
                        ))}
                        <path
                          d={`M ${x} 214 v 5 M ${x} 217 H ${x + width} M ${x + width} 214 v 5`}
                          stroke="#54737a"
                          fill="none"
                        />
                        <text
                          x="160"
                          y="237"
                          textAnchor="middle"
                          fill="#244d57"
                          fontSize="12"
                          fontFamily="Arial"
                        >
                          {d.widthFt.toFixed(2)} ft wide
                        </text>
                        <text
                          x="160"
                          y="18"
                          textAnchor="middle"
                          fill="#244d57"
                          fontSize="12"
                          fontFamily="Arial"
                        >
                          {d.heightFt.toFixed(2)} ft tall
                        </text>
                      </svg>
                      <figcaption>
                        {s.name}
                        {s.quantity > 1 ? ` ${instance + 1}` : ""}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        {quote && <PackageEquipment quote={quote} />}
      </div>
      <p className="wv-note">{wallVisualCopy.disclaimer}</p>
    </section>
  );
}
