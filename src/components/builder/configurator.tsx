import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ClientOnly, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, Undo2, Redo2, Check, Cpu, GraduationCap, LifeBuoy, LoaderCircle, Minus, Play, Plus, Ruler, Share2, Square, Wrench, X } from 'lucide-react';
import { Logo } from '@/components/axis/logo';
import { GlassButton } from '@/components/axis/glass';
import {
  brightnessRange, builderCopy, cameraViews, computeSummary, contents, extras, indoorLighting, layouts, mounts, outdoorLighting, pitches, pitchOf,
  roomSizes, sizeLimits, sizePresets, shapePresets, steps, venues, viewQuality, viewQualityLabels, ambientLevel, selectionsSchema, defaultSelections,
} from '@/config/builder';
import { formCopy, formFields, quoteSchema } from '@/config/quote';
import { site } from '@/config/site';
import { submitBuildQuote } from '@/lib/builds.functions';
import { builder, selectionsOf, setBuilder, useBuilder } from './store';
import { addCol, addRow, applyShape, fitFeet, key as gridKey, redoGrid, removeCol, removeRow, setCell, setSideCols, setSize, undoGrid } from './grid';
import { slotOf } from './slots';

const BuilderScene = lazy(() => import('./builder-scene'));
const EASE = [0.65, 0, 0.35, 1] as const;

/* ---------- small pieces ---------- */
function Roll({ value, format = (v: number) => Math.round(v).toLocaleString() }: { value: number; format?: (v: number) => string }) {
  const mv = useMotionValue(value); const text = useTransform(mv, format);
  useEffect(() => { const c = animate(mv, value, { duration: 0.7, ease: EASE }); return () => c.stop(); }, [value, mv]);
  return <motion.span className="roll">{text}</motion.span>;
}
function Choice({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return <motion.button type="button" className={`cfg-choice ${selected ? 'selected' : ''} ${className}`} onClick={onClick} aria-pressed={selected} whileTap={{ scale: 0.96 }} animate={selected ? { scale: [1, 1.04, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>{children}</motion.button>;
}
function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value)); useEffect(() => setDraft(String(value)), [value]);
  const commitDraft = () => { const n = parseInt(draft, 10); if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n))); else setDraft(String(value)); };
  return <div className="cfg-stepper"><span className="eyebrow">{label}</span><div>
    <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus /></motion.button>
    <motion.input key={value} aria-label={label} inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value.replace(/\D/g, '').slice(0, 2))} onBlur={commitDraft} onKeyDown={e => { if (e.key === 'Enter') { commitDraft(); (e.target as HTMLInputElement).blur(); } if (e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(max, value + 1)); } if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(min, value - 1)); } }}
      initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} />
    <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus /></motion.button>
  </div></div>;
}
function FitFeet() {
  const s = useBuilder(); const sum = computeSummary(selectionsOf(s));
  const [w, setW] = useState(''), [h, setH] = useState('');
  return <form className="fit-feet" onSubmit={e => { e.preventDefault(); fitFeet(Number(w) || sum.widthFt, Number(h) || sum.heightFt); setW(''); setH(''); }}>
    <span className="eyebrow">Fit to my stage</span>
    <div><label><input inputMode="decimal" placeholder={sum.widthFt.toFixed(1)} value={w} onChange={e => setW(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Width in feet" /><small>ft wide</small></label>
      <label><input inputMode="decimal" placeholder={sum.heightFt.toFixed(1)} value={h} onChange={e => setH(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Height in feet" /><small>ft tall</small></label>
      <button type="submit" className="fit-go">Fit</button></div>
  </form>;
}
/** 2D map of every cabinet slot: click or drag to paint cabinets in and out. */
function GridEditor() {
  const s = useBuilder(); const paint = useRef<boolean | null>(null);
  useEffect(() => { const up = () => { paint.current = null; }; window.addEventListener('pointerup', up); return () => window.removeEventListener('pointerup', up); }, []);
  const holes = new Set(s.holes);
  const cells: ReactNode[] = [];
  for (let r = s.rows - 1; r >= 0; r--) for (let c = 0; c < s.cols; c++) {
    const k = gridKey(c, r), filled = !holes.has(k);
    cells.push(<button key={k} type="button" className={`ge-cell ${filled ? 'on' : ''} ${s.hover === `c${slotOf(c, r)}` || s.hover === `g${slotOf(c, r)}` ? 'hot' : ''}`} aria-label={`Cabinet column ${c + 1}, row ${r + 1}: ${filled ? 'filled' : 'empty'}`} aria-pressed={filled}
      onPointerDown={e => { e.preventDefault(); (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); paint.current = !filled; setCell(c, r, !filled); }}
      onPointerEnter={() => { setBuilder({ hover: `c${slotOf(c, r)}` }); if (paint.current !== null) setCell(c, r, paint.current); }}
      onPointerLeave={() => setBuilder({ hover: '' })}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCell(c, r, !filled); } }} />);
  }
  return <div className="grid-editor">
    <div className="ge-head"><span className="eyebrow">Cabinet map</span><span className="ge-tools">
      <button type="button" onClick={undoGrid} aria-label="Undo"><Undo2 /></button><button type="button" onClick={redoGrid} aria-label="Redo"><Redo2 /></button></span></div>
    <div className="ge-grid" style={{ gridTemplateColumns: `repeat(${s.cols}, 1fr)`, aspectRatio: `${s.cols}/${s.rows}` }} onPointerLeave={() => { paint.current = null; }}>{cells}</div>
    <div className="ge-edges">
      <span>Left <button type="button" onClick={() => addCol('left')}>+</button><button type="button" onClick={() => removeCol('left')}>−</button></span>
      <span>Top <button type="button" onClick={() => addRow('top')}>+</button><button type="button" onClick={() => removeRow('top')}>−</button></span>
      <span>Bottom <button type="button" onClick={() => addRow('bottom')}>+</button><button type="button" onClick={() => removeRow('bottom')}>−</button></span>
      <span>Right <button type="button" onClick={() => addCol('right')}>+</button><button type="button" onClick={() => removeCol('right')}>−</button></span>
    </div>
    <div className="ge-shapes">{shapePresets.map(p => <button key={p.id} type="button" onClick={() => applyShape(p.id)}>{p.label}</button>)}</div>
  </div>;
}
function Slider({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return <label className="cfg-slider"><span className="cfg-slider-top"><span className="eyebrow">{label}</span><b><Roll value={value} />{suffix}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ '--pct': `${pct}%` } as React.CSSProperties} /></label>;
}
function MiniLayout({ id }: { id: string }) {
  const bars = id === 'single' ? [[30, 0, 40]] : id === 'sides' ? [[30, 0, 40], [6, 4, 14], [80, 4, 14]] : id === 'panorama' ? [[8, 2, 84]] : [];
  return <svg viewBox="0 0 100 30" className="mini-layout" aria-hidden="true">{id === 'curved' ? <path d="M15 8 Q50 22 85 8" /> : bars.map(([x, y, w], i) => <rect key={i} x={x} y={(y ?? 0) + 6} width={w} height={14} rx={1} />)}</svg>;
}
function PixelPreview({ mm }: { mm: number }) { return <span className="pixel-preview" style={{ backgroundSize: `${mm * 2.4}px ${mm * 2.4}px` }} />; }
const extraIcons: Record<string, ReactNode> = { processor: <Cpu />, spares: <Box />, install: <Wrench />, training: <GraduationCap />, support: <LifeBuoy /> };

/* ---------- step panels ---------- */
function StepBody({ index }: { index: number }) {
  const s = useBuilder(); const pitch = pitchOf(s); const sum = computeSummary(selectionsOf(s));
  switch (steps[index]?.id) {
    case 'venue': return <>
      <div className="cfg-grid two">{venues.map(v => <Choice key={v.id} className="venue-card" selected={s.venue === v.id} onClick={() => { if (s.venue === v.id) return; setBuilder({ venue: v.id, venueChangedAt: performance.now(), lighting: v.id === 'outdoor' ? 'sunset' : 'worship' }); }}><span className={`venue-preview ${v.id}`} /><b>{v.label}</b><small>{v.note}</small></Choice>)}</div>
      <span className="eyebrow cfg-sub">Room size</span>
      <div className="cfg-list">{roomSizes.map(r => <Choice key={r.id} selected={s.room === r.id} onClick={() => setBuilder({ room: r.id })}><b>{r.label}</b><small>{r.note}</small></Choice>)}</div>
    </>;
    case 'pitch': { const q = viewQuality(pitch.mm, s.viewingFt); return <>
      <div className="cfg-grid two">{pitches.map(p => <Choice key={p.id} selected={s.pitch === p.id} onClick={() => setBuilder({ pitch: p.id, pitchChangedAt: performance.now() })}><PixelPreview mm={p.mm} /><b>{p.label}</b><small>{p.note}</small></Choice>)}</div>
      <Slider label={builderCopy.viewing} value={s.viewingFt} min={5} max={120} step={1} suffix=" ft" onChange={v => setBuilder({ viewingFt: v })} />
      <div className={`quality-meter q${q}`}><span className="meter"><i style={{ width: `${(2 - q) * 50 + 8}%` }} /></span><b>{viewQualityLabels[q]}</b></div>
    </>; }
    case 'size': return <>
      <div className="cfg-grid two"><Stepper label="Wide" value={s.cols} min={sizeLimits.minCols} max={sizeLimits.maxCols} onChange={v => setSize(v, s.rows)} /><Stepper label="Tall" value={s.rows} min={sizeLimits.minRows} max={sizeLimits.maxRows} onChange={v => setSize(s.cols, v)} /></div>
      <FitFeet />
      <div className="cfg-counters"><div><span className="eyebrow">Size</span><b><Roll value={sum.widthFt} format={v => v.toFixed(1)} /> × <Roll value={sum.heightFt} format={v => v.toFixed(1)} /> ft</b></div><div><span className="eyebrow">Resolution</span><b><Roll value={sum.resW} /> × <Roll value={sum.resH} /></b></div><div><span className="eyebrow">Cabinets</span><b><Roll value={sum.cabinets} /></b></div></div>
      <GridEditor />
      <span className="eyebrow cfg-sub">Presets</span>
      <div className="cfg-grid three">{sizePresets.map(p => <Choice key={p.id} selected={s.cols === p.cols && s.rows === p.rows} onClick={() => setSize(p.cols, p.rows)}><b>{p.label}</b><small>{p.cols}×{p.rows}</small></Choice>)}</div>
      {s.layout === 'sides' && <><span className="eyebrow cfg-sub">Side walls</span><Stepper label="Side wall columns" value={s.sideCols} min={sizeLimits.minSide} max={sizeLimits.maxSide} onChange={setSideCols} /></>}
      <p className="cfg-hint">Click a cabinet on the wall to remove it, click an empty outline to add it back. Use + / − on any edge.</p>
    </>;
    case 'layout': return <><div className="cfg-grid two">{layouts.map(l => <Choice key={l.id} selected={s.layout === l.id} onClick={() => setBuilder({ layout: l.id })}><MiniLayout id={l.id} /><b>{l.label}</b><small>{l.note}</small></Choice>)}</div>
      {s.layout === 'sides' && <><span className="eyebrow cfg-sub">Side walls</span><Stepper label="Side wall columns" value={s.sideCols} min={sizeLimits.minSide} max={sizeLimits.maxSide} onChange={setSideCols} /></>}</>;
    case 'light': { const opts = s.venue === 'outdoor' ? outdoorLighting : indoorLighting; const crisp = s.brightness / 1200 - (ambientLevel[s.lighting] ?? 0.4) * 0.6; return <>
      <Slider label={builderCopy.brightness} value={s.brightness} min={brightnessRange.min} max={brightnessRange.max} step={brightnessRange.step} suffix=" nits" onChange={v => setBuilder({ brightness: v })} />
      <div className="cfg-grid two">{opts.map(o => <Choice key={o.id} selected={s.lighting === o.id} onClick={() => setBuilder({ lighting: o.id })}><b>{o.label}</b></Choice>)}</div>
      <div className={`quality-meter ${crisp > 0.15 ? 'q0' : crisp > -0.15 ? 'q1' : 'q2'}`}><span className="meter"><i style={{ width: `${Math.max(8, Math.min(100, 50 + crisp * 120))}%` }} /></span><b>{crisp > 0.15 ? 'Crisp' : crisp > -0.15 ? 'Balanced' : 'Washed out'}</b></div>
    </>; }
    case 'content': return <><div className="cfg-grid two">{contents.map(c => <Choice key={c.id} selected={s.content === c.id} onClick={() => setBuilder({ content: c.id, contentChangedAt: performance.now() })}><span className={`content-thumb ${c.id}`} /><b>{c.label}</b></Choice>)}</div><PlaySunday /></>;
    case 'mount': return <div className="cfg-grid two">{mounts.map(m => <Choice key={m.id} selected={s.mount === m.id} onClick={() => setBuilder({ mount: m.id })}><b>{m.label}</b><small>{m.note}</small></Choice>)}</div>;
    case 'extras': return <div className="cfg-list">{extras.map(x => { const on = s.extras.includes(x.id); return <Choice key={x.id} className="extra-card" selected={on} onClick={() => setBuilder({ extras: on ? s.extras.filter(e => e !== x.id) : [...s.extras, x.id] })}>{extraIcons[x.id]}<span><b>{x.label}</b><small>{x.note}</small></span><span className="toggle"><i /></span></Choice>; })}</div>;
    case 'review': return <Review />;
    default: return null;
  }
}

function PlaySunday() {
  const s = useBuilder();
  const timers = useRef<number[]>([]);
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; setBuilder({ playing: false }); };
  const play = () => {
    const seq: [number, Partial<ReturnType<typeof builder['current']['valueOf']>> & Record<string, unknown>][] = [
      [0, { camera: 'back', content: 'motion', lighting: s.venue === 'outdoor' ? 'sunset' : 'dim' }], [3000, { camera: 'center', content: 'lyrics', lighting: s.venue === 'outdoor' ? 'night' : 'worship' }],
      [6000, { camera: 'stage', content: 'imag' }], [9000, { camera: 'side', content: 'slides', lighting: s.venue === 'outdoor' ? 'night' : 'house' }], [12000, { camera: 'aerial', content: 'announce' }],
    ];
    setBuilder({ playing: true });
    seq.forEach(([t, p]) => timers.current.push(window.setTimeout(() => setBuilder(st => ({ ...p, cameraNonce: st.cameraNonce + 1 })), t)));
    timers.current.push(window.setTimeout(stop, 15000));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return <GlassButton type="button" className="cfg-wide" onClick={s.playing ? stop : play}>{s.playing ? <Square /> : <Play />}{s.playing ? builderCopy.stop : builderCopy.playSunday}</GlassButton>;
}

function Review() {
  const s = useBuilder(); const sum = computeSummary(selectionsOf(s)); const [copied, setCopied] = useState(false);
  const rows: [string, ReactNode][] = [
    ['Dimensions', <><Roll value={sum.widthFt} format={v => v.toFixed(1)} /> × <Roll value={sum.heightFt} format={v => v.toFixed(1)} /> ft</>],
    ['Resolution', <><Roll value={sum.resW} /> × <Roll value={sum.resH} /></>], ['Cabinets', <Roll value={sum.cabinets} />], ['Pixel pitch', `${sum.pitch} mm`],
    ['Weight', <><Roll value={sum.weightLb} /> lb</>], ['Power (avg / max)', <><Roll value={sum.powerW} /> / <Roll value={sum.maxPowerW} /> W</>], ['Min. viewing', <><Roll value={sum.minViewFt} format={v => v.toFixed(0)} /> ft</>],
  ];
  const share = async () => { const url = `${window.location.origin}/build?b=${encodeURIComponent(btoa(JSON.stringify(selectionsOf(builder.current))))}`; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copy link', url); } };
  return <><dl className="spec-sheet">{rows.map(([k, v], i) => <motion.div key={k} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: EASE }}><dt>{k}</dt><dd>{v}</dd></motion.div>)}</dl>
    <GlassButton primary type="button" className="cfg-wide shimmer-glow" onClick={() => openQuote()}>{builderCopy.getQuote}<ArrowUpRight /></GlassButton>
    <GlassButton type="button" className="cfg-wide" onClick={share}>{copied ? <Check /> : <Share2 />}{copied ? builderCopy.copied : builderCopy.share}</GlassButton></>;
}

/* ---------- quote modal ---------- */
let quoteOpener: () => void = () => {};
function openQuote() { quoteOpener(); }
function QuoteModal() {
  const [open, setOpen] = useState(false); const submit = useServerFn(submitBuildQuote);
  const [errors, setErrors] = useState<Record<string, string>>({}), [pending, setPending] = useState(false), [done, setDone] = useState(false), [failure, setFailure] = useState('');
  useEffect(() => { quoteOpener = () => { setBuilder({ flash: performance.now() }); setTimeout(() => setOpen(true), 380); }; }, []);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); const parsed = quoteSchema.safeParse(values);
    if (!parsed.success) { const n: Record<string, string> = {}; parsed.error.issues.forEach(i => { n[String(i.path[0])] = i.message; }); setErrors(n); return; }
    setErrors({}); setPending(true); setFailure('');
    try { await submit({ data: { selections: selectionsOf(builder.current), quote: values } }); setDone(true); } catch { setFailure(formCopy.error); } finally { setPending(false); }
  }
  const sum = computeSummary(selectionsOf(builder.current));
  return <AnimatePresence>{open && <motion.div className="cfg-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
    <motion.div role="dialog" aria-modal="true" aria-label={builderCopy.quoteTitle} className="cfg-modal glass-card" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} onClick={e => e.stopPropagation()}>
      <button type="button" className="cfg-close" aria-label="Close" onClick={() => setOpen(false)}><X /></button>
      {done ? <div className="form-success"><svg className="success-check" viewBox="0 0 32 32" fill="none"><motion.path d="m5 16 7 7L27 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} /></svg><h3>{formCopy.successTitle}</h3><p>{site.copy.success}</p></div> : <>
        <span className="eyebrow eyebrow-accent">{sum.widthFt.toFixed(1)} × {sum.heightFt.toFixed(1)} ft · {sum.cabinets} cabinets · P{sum.pitch}</span><h2 className="cfg-modal-title">{builderCopy.quoteTitle}</h2>
        <form onSubmit={handle} noValidate><div className="quote-form-grid">{formFields.filter(f => f.name !== 'stage_width').map(f => <div key={f.name} className={`form-field ${f.wide ? 'wide' : ''} ${errors[f.name] ? 'invalid' : ''}`}><label htmlFor={`b-${f.name}`}>{f.label}{f.required ? ' *' : ''}</label>
          {f.options ? <select className="form-control" id={`b-${f.name}`} name={f.name} defaultValue=""><option value="" disabled={f.required}>{formCopy.choose}</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
            : f.multiline ? <textarea className="form-control" id={`b-${f.name}`} name={f.name} maxLength={3000} /> : <input className="form-control" id={`b-${f.name}`} name={f.name} type={f.type ?? 'text'} maxLength={f.name === 'email' ? 255 : 150} />}
          {errors[f.name] && <p className="field-error">{errors[f.name]}</p>}</div>)}</div>
          <input type="hidden" name="stage_width" value={Math.ceil(sum.widthFt)} /><div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></div>
          {failure && <p className="field-error" role="alert">{failure}</p>}
          <GlassButton primary type="submit" disabled={pending} className={`form-submit ${pending ? 'shimmer' : ''}`}>{pending ? site.buttons.sending : site.buttons.submit}{pending ? <LoaderCircle className="animate-spin" /> : <ArrowUpRight />}</GlassButton></form></>}
    </motion.div></motion.div>}</AnimatePresence>;
}

/* ---------- 2D fallback ---------- */
function FlatWall() {
  const s = useBuilder(); const flash = useRef(0);
  return <div className="flat-stage" data-venue={s.venue}><div className="flat-wall" style={{ gridTemplateColumns: `repeat(${s.cols}, 1fr)`, aspectRatio: `${s.cols}/${s.rows}`, filter: `brightness(${0.5 + s.brightness / 1200})`, marginTop: s.mount === 'flown' ? '0' : '8%' }} data-content={s.content} key={flash.current}>
    {Array.from({ length: s.cols * s.rows }, (_, i) => { const c = i % s.cols, r = s.rows - 1 - Math.floor(i / s.cols); return <span key={i} className={s.holes.includes(gridKey(c, r)) ? 'hole' : ''} />; })}<div className="flat-content" /></div><p className="cfg-hint">{builderCopy.fallbackNote}</p></div>;
}

/* ---------- main ---------- */
export function Configurator() {
  const s = useBuilder(); const reduced = useReducedMotion();
  const [mode, setMode] = useState<'3d' | 'flat' | null>(null); const [mobile, setMobile] = useState(false); const [dir, setDir] = useState(1); const [sheetOpen, setSheetOpen] = useState(true);
  useEffect(() => {
    let webgl = false; try { webgl = Boolean(document.createElement('canvas').getContext('webgl2')); } catch { webgl = false; }
    const flat = !webgl || window.matchMedia('(prefers-reduced-motion: reduce)').matches; setMode(flat ? 'flat' : '3d');
    const r = () => setMobile(window.innerWidth < 900); r(); window.addEventListener('resize', r);
    const b = new URLSearchParams(window.location.search).get('b');
    if (b) { try { const p = selectionsSchema.safeParse(JSON.parse(atob(b))); if (p.success) setBuilder(p.data); } catch { /* ignore bad link */ } }
    const t = setTimeout(() => setBuilder({ introDone: true }), flat ? 0 : 3200);
    const keys = (e: KeyboardEvent) => { const tag = (e.target as HTMLElement | null)?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA') return; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redoGrid(); else undoGrid(); } };
    window.addEventListener('keydown', keys);
    return () => { clearTimeout(t); window.removeEventListener('keydown', keys); window.removeEventListener('resize', r); setBuilder({ ...defaultSelections, step: 0, introDone: false, ready: false }); };
  }, []);
  const goStep = (i: number) => { const n = Math.max(0, Math.min(steps.length - 1, i)); setDir(n >= s.step ? 1 : -1); setBuilder(st => ({ step: n, camera: steps[n]!.camera, cameraNonce: st.cameraNonce + 1 })); };
  const sum = computeSummary(selectionsOf(s)); const step = steps[s.step]!;
  const skip = () => { if (!s.introDone) setBuilder({ introDone: true }); };
  const ui = s.introDone;

  const panel = <div className="cfg-panel-inner">
    <div className="cfg-panel-head"><span className="eyebrow eyebrow-accent">Step {s.step + 1} / {steps.length}</span></div>
    <div className="cfg-panel-body"><AnimatePresence mode="wait" custom={dir} initial={false}>
      <motion.div key={s.step} custom={dir} initial={reduced ? false : { x: dir * 50, opacity: 0, filter: 'blur(8px)' }} animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }} exit={reduced ? { opacity: 0 } : { x: dir * -50, opacity: 0, filter: 'blur(8px)' }} transition={{ duration: 0.45, ease: EASE }}>
        <h2 className="cfg-title">{step.title}</h2><p className="cfg-text">{step.text}</p><StepBody index={s.step} />
      </motion.div></AnimatePresence></div>
    <div className="cfg-panel-nav"><GlassButton type="button" onClick={() => goStep(s.step - 1)} disabled={s.step === 0}><ArrowLeft />{builderCopy.back}</GlassButton>{s.step < steps.length - 1 && <GlassButton primary type="button" onClick={() => goStep(s.step + 1)}>{builderCopy.next}<ArrowRight /></GlassButton>}</div>
  </div>;

  return <div className="cfg-root" onClick={skip}>
    <div className={`cfg-scene ${mobile ? 'mobile' : ''}`}>
      {mode === '3d' && <ClientOnly fallback={null}><Suspense fallback={null}><BuilderScene mobile={mobile} /></Suspense></ClientOnly>}
      {mode === 'flat' && <FlatWall />}
      {mode === '3d' && !s.ready && <div className="scene-loader cfg-loader"><span className="loader-ring" /><span>{builderCopy.loader}</span></div>}
      {s.step === 1 && ui && <motion.div key={s.pitch} className="zoom-lens" aria-hidden="true" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
        <span className="lens-pixels" style={{ backgroundSize: `${pitchOf(s).mm * 7}px ${pitchOf(s).mm * 7}px` }} /><span className="lens-ripple" /><b>{pitchOf(s).label}</b></motion.div>}
    </div>

    <AnimatePresence>{!ui && <motion.div className="cfg-intro" exit={{ opacity: 0 }} transition={{ duration: 0.6 }}><motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.8 }}>{builderCopy.intro}</motion.h1><span className="eyebrow">{builderCopy.skip}</span></motion.div>}</AnimatePresence>

    <AnimatePresence>{ui && <>
      <motion.header key="top" className="cfg-top" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: EASE }}>
        <Link to="/" aria-label="Axis home" className="cfg-logo"><Logo /></Link>
        <nav className="cfg-progress glass-card" aria-label="Builder steps">{steps.map((st, i) => <button key={st.id} type="button" className={`${i === s.step ? 'active' : ''} ${i < s.step ? 'done' : ''}`} onClick={() => goStep(i)} aria-current={i === s.step ? 'step' : undefined}><i />{!mobile && <span>{st.label}</span>}</button>)}</nav>
      </motion.header>
      {mode === '3d' && <motion.div key="cams" className="cfg-cams glass-card" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}>
        {cameraViews.map(c => <button key={c.id} type="button" className={s.camera === c.id && s.step !== 1 ? 'active' : ''} onClick={() => setBuilder(st => ({ camera: c.id, cameraNonce: st.cameraNonce + 1, step: st.step === 1 ? 2 : st.step }))}>{c.label}</button>)}
        <button type="button" className={s.dims ? 'active' : ''} onClick={() => setBuilder({ dims: !s.dims })}><Ruler />{builderCopy.dimensions}</button>
      </motion.div>}
      {mobile ? <motion.aside key="sheet" className="cfg-sheet glass-card" drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2} onDragEnd={(_, i) => { if (i.offset.y > 60) setSheetOpen(false); if (i.offset.y < -60) setSheetOpen(true); }} initial={{ y: 300 }} animate={{ y: 0, height: sheetOpen ? '52svh' : '120px' }} transition={{ duration: 0.5, ease: EASE }}>
        <button type="button" className="sheet-grip" aria-label={sheetOpen ? 'Collapse' : 'Expand'} onClick={() => setSheetOpen(o => !o)} />{panel}</motion.aside>
        : <motion.aside key="panel" className="cfg-panel glass-card" initial={{ x: 420 }} animate={{ x: 0 }} transition={{ duration: 0.7, ease: EASE }}>{panel}</motion.aside>}
      <motion.footer key="sum" className="cfg-summary glass-card" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}>
        <span className="mini-wall" style={{ aspectRatio: `${s.cols}/${s.rows}` }} data-content={s.content} />
        <div className="sum-stats"><span><small>Size</small><b><Roll value={sum.widthFt} format={v => v.toFixed(1)} />×<Roll value={sum.heightFt} format={v => v.toFixed(1)} /> ft</b></span><span><small>Resolution</small><b><Roll value={sum.resW} />×<Roll value={sum.resH} /></b></span><span><small>Cabinets</small><b><Roll value={sum.cabinets} /></b></span></div>
        <GlassButton primary type="button" className="shimmer-glow" onClick={() => openQuote()}>{builderCopy.getQuote}<ArrowUpRight /></GlassButton>
      </motion.footer>
    </>}</AnimatePresence>
    <QuoteModal />
  </div>;
}
