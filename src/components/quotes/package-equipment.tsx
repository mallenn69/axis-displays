import { costLabels, type QuoteInput } from "@/config/quote-workspace";

type Kind = "support" | "processor" | "case" | "bar" | "sling" | "panel" | "cables";
function EquipmentArt({ kind }: { kind: Kind }) {
  return (
    <svg
      viewBox="0 0 200 160"
      role="img"
      aria-label={`${kind} illustration`}
      fill="none"
      stroke="#244d57"
      strokeWidth="3"
      strokeLinejoin="round"
    >
      {kind === "support" && (
        <>
          <path d="M65 136 L135 136 L157 149 L43 149 Z" fill="#334952" />
          <path d="M85 136 V12 H115 V136 M85 12 L115 43 L85 74 L115 105 L85 136 M115 12 L85 43 L115 74 L85 105 L115 136" />
          {[36, 76, 116].map((y) => (
            <path key={y} d={`M115 ${y} h17 v8 h-17`} stroke="#158c86" />
          ))}
        </>
      )}
      {kind === "processor" && (
        <>
          <path d="M20 66 L40 48 H165 L180 66 V111 H20 Z" fill="#283e47" />
          <path d="M20 66 H180 M31 77 v23 M169 77 v23" stroke="#88a8af" />
          <rect x="49" y="78" width="48" height="22" rx="2" fill="#52bfb7" />
          {[110, 122, 134].map((x) => (
            <circle key={x} cx={x} cy="84" r="2" fill="#8ba9b0" />
          ))}
          <circle cx="151" cy="90" r="8" stroke="#c0d2d7" />
        </>
      )}
      {kind === "case" && (
        <>
          <path d="M38 43 L65 24 H157 L171 42 V126 L145 141 H38 Z" fill="#354b53" />
          <path
            d="M38 43 H145 L171 26 M145 43 V141 M38 67 H145 L171 51 M65 24 L38 43"
            stroke="#b0c5cb"
          />
          <rect x="78" y="84" width="28" height="12" rx="3" stroke="#c4d8dd" />
          <path d="M54 58 v18 M126 58 v18" stroke="#c4d8dd" strokeWidth="6" />
          <circle cx="53" cy="146" r="6" fill="#243b44" />
          <circle cx="133" cy="146" r="6" fill="#243b44" />
        </>
      )}
      {kind === "bar" && (
        <>
          <rect x="22" y="82" width="156" height="16" fill="#354b53" />
          <path d="M57 82 V61 h13 v21 M129 82 V61 h13 v21" />
          {[40, 80, 120, 160].map((x) => (
            <circle key={x} cx={x} cy="90" r="3" fill="#b1dad8" />
          ))}
        </>
      )}
      {kind === "sling" && (
        <>
          <path
            d="M75 120 C25 15 175 15 125 120 C116 145 84 145 75 120 Z"
            stroke="#168b85"
            strokeWidth="12"
          />
          <path d="M79 119 C50 40 150 40 121 119" stroke="#b5e4df" />
        </>
      )}
      {kind === "panel" && (
        <>
          <rect x="52" y="20" width="96" height="120" fill="#164b58" />
          <path d="M52 80 H148 M100 20 V140" stroke="#74d9cf" />
        </>
      )}
      {kind === "cables" && (
        <>
          <path
            d="M42 46 C140 10 180 130 88 130 C20 130 28 65 84 65 C149 65 131 113 93 110"
            stroke="#344e58"
            strokeWidth="7"
          />
          <path d="M42 46 l-12 -10 M93 110 l-5 -13" />
          <rect x="20" y="22" width="20" height="18" rx="3" fill="#168b85" />
          <rect x="78" y="81" width="20" height="18" rx="3" fill="#168b85" />
        </>
      )}
    </svg>
  );
}
export function PackageEquipment({ quote: q }: { quote: QuoteInput }) {
  const singles =
    q.sections
      .filter((s) => s.type === "single")
      .reduce((n, s) => n + s.wide * s.tall * s.quantity, 0) + q.spareSingles;
  const doubles =
    q.sections
      .filter((s) => s.type === "double")
      .reduce((n, s) => n + s.wide * s.tall * s.quantity, 0) + q.spareDoubles;
  const cases = Math.ceil(singles / 8) + Math.ceil(doubles / 6);
  const items: { kind: Kind; label: string; detail: string }[] = [];
  if (q.mount === "ground" && q.supports > 0)
    items.push({
      kind: "support",
      label: "Base plate + truss",
      detail: `${q.supports} base plates · ${q.supports} truss sections · ${q.supports * q.clampsPerSupport} clamps`,
    });
  if (q.mount === "hung") {
    if (q.bars > 0)
      items.push({ kind: "bar", label: "Hanging bars", detail: `${q.bars} included` });
    if (q.slings > 0)
      items.push({ kind: "sling", label: "SpanSet slings", detail: `${q.slings} included` });
  }
  if (q.processor !== "none" && q.processors > 0)
    items.push({
      kind: "processor",
      label: costLabels[q.processor],
      detail: `${q.processors} included`,
    });
  if (q.cases && cases > 0)
    items.push({
      kind: "case",
      label: "Flight cases",
      detail: `${cases} included · one case illustrated`,
    });
  if (q.spareSingles + q.spareDoubles > 0)
    items.push({
      kind: "panel",
      label: "Spare panels",
      detail: `${q.spareSingles} singles · ${q.spareDoubles} doubles`,
    });
  items.push({
    kind: "cables",
    label: "Power + data cables",
    detail: "Standard panel cables included",
  });
  return (
    <aside className="wv-equipment" aria-label="Package equipment">
      <h3>Package equipment</h3>
      {items.map((item) => (
        <figure key={item.kind}>
          <EquipmentArt kind={item.kind} />
          <figcaption>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </figcaption>
        </figure>
      ))}
    </aside>
  );
}
