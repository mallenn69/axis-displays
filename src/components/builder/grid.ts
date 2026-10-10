import { activeHoles, sizeLimits, cabinet } from '@/config/builder';
import { builder, setBuilder } from './store';

type Snap = { cols: number; rows: number; holes: string[]; sideCols: number };
const undo: Snap[] = [], redo: Snap[] = [];
const snap = (): Snap => { const s = builder.current; return { cols: s.cols, rows: s.rows, holes: s.holes, sideCols: s.sideCols }; };
const clampC = (v: number) => Math.max(sizeLimits.minCols, Math.min(sizeLimits.maxCols, v));
const clampR = (v: number) => Math.max(sizeLimits.minRows, Math.min(sizeLimits.maxRows, v));
export const key = (c: number, r: number) => `${c}:${r}`;
const parse = (h: string) => h.split(':').map(Number) as [number, number];

/** Every grid edit goes through here so it can be undone. */
export function commit(patch: Partial<Snap>, shift?: { dx: number; dy: number }) {
  const before = snap(); const next = { ...before, ...patch };
  next.holes = activeHoles(next);
  if (next.cols === before.cols && next.rows === before.rows && next.sideCols === before.sideCols && next.holes.join() === before.holes.join()) return;
  undo.push(before); if (undo.length > 60) undo.shift(); redo.length = 0;
  setBuilder(s => ({ ...next, ...(shift ? { shift: { ...shift, n: s.shift.n + 1 } } : {}) }));
}
export function undoGrid() { const p = undo.pop(); if (!p) return; redo.push(snap()); setBuilder(p); }
export function redoGrid() { const p = redo.pop(); if (!p) return; undo.push(snap()); setBuilder(p); }
export const canUndo = () => undo.length > 0;

export function setSize(cols: number, rows: number) { commit({ cols: clampC(cols), rows: clampR(rows) }); }
export function addCol(side: 'left' | 'right', n = 1) {
  const s = builder.current; const cols = clampC(s.cols + n); const added = cols - s.cols; if (!added) return;
  if (side === 'right') return commit({ cols });
  commit({ cols, holes: s.holes.map(h => { const [c, r] = parse(h); return key(c + added, r); }) }, { dx: added, dy: 0 });
}
export function removeCol(side: 'left' | 'right') {
  const s = builder.current; if (s.cols <= sizeLimits.minCols) return;
  if (side === 'right') return commit({ cols: s.cols - 1 });
  commit({ cols: s.cols - 1, holes: s.holes.flatMap(h => { const [c, r] = parse(h); return c === 0 ? [] : [key(c - 1, r)]; }) }, { dx: -1, dy: 0 });
}
export function addRow(side: 'top' | 'bottom') {
  const s = builder.current; if (s.rows >= sizeLimits.maxRows) return;
  if (side === 'top') return commit({ rows: s.rows + 1 });
  commit({ rows: s.rows + 1, holes: s.holes.map(h => { const [c, r] = parse(h); return key(c, r + 1); }) }, { dx: 0, dy: 1 });
}
export function removeRow(side: 'top' | 'bottom') {
  const s = builder.current; if (s.rows <= sizeLimits.minRows) return;
  if (side === 'top') return commit({ rows: s.rows - 1 });
  commit({ rows: s.rows - 1, holes: s.holes.flatMap(h => { const [c, r] = parse(h); return r === 0 ? [] : [key(c, r - 1)]; }) }, { dx: 0, dy: -1 });
}
export function setCell(c: number, r: number, filled: boolean) {
  const s = builder.current; const k = key(c, r); const has = s.holes.includes(k);
  if (filled && has) commit({ holes: s.holes.filter(h => h !== k) });
  else if (!filled && !has) commit({ holes: [...s.holes, k] });
}
export const isHole = (c: number, r: number) => builder.current.holes.includes(key(c, r));
export function setSideCols(n: number) { commit({ sideCols: Math.max(sizeLimits.minSide, Math.min(sizeLimits.maxSide, n)) }); }

/** Converts a target size in feet to the closest cabinet grid. */
export function fitFeet(widthFt: number, heightFt: number) {
  setSize(Math.round((widthFt * 304.8) / cabinet.widthMm), Math.round((heightFt * 304.8) / cabinet.heightMm));
}

export function applyShape(id: string) {
  const { cols, rows } = builder.current; const holes: string[] = [];
  const mid = (cols - 1) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const dx = Math.abs(c - mid), top = rows - 1 - r;
    let empty = false;
    if (id === 'notch') empty = r < Math.max(1, Math.round(rows * 0.35)) && dx < Math.max(1, cols * 0.15);
    if (id === 'stepped') { const steps = Math.min(3, Math.floor(rows / 2)), stepW = Math.max(1, Math.round(cols / 8)); empty = top < steps && dx > mid - (steps - top) * stepW + 0.5; }
    if (id === 'split') empty = cols >= 5 && dx < (cols % 2 ? 0.6 : 1.1);
    if (id === 'arch') { const R = Math.max(1.5, Math.min(rows, cols / 2) * 0.7), px = dx - (mid - R), py = R - 1 - top; empty = px > 0 && py > 0 && Math.hypot(px, py) > R - 0.3; }
    if (empty) holes.push(key(c, r));
  }
  commit({ holes });
}
