import { useSyncExternalStore } from "react";
import { defaultDesign, studioSchema, type StudioDesign, type Section } from "@/config/studio";
const key = "axis-stage-designer-v1";
let state = {
  design: defaultDesign,
  selected: "wall",
  saved: false,
  undo: [] as StudioDesign[],
  redo: [] as StudioDesign[],
};
let gestureStart: StudioDesign | null = null;
export function beginGesture() {
  gestureStart = state.design;
}
export function endGesture() {
  if (gestureStart && gestureStart !== state.design) {
    state = { ...state, undo: [...state.undo, gestureStart].slice(-50), redo: [] };
    persist();
    emit();
  }
  gestureStart = null;
}
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify(state.design));
    state = { ...state, saved: true };
  } catch {
    state = { ...state, saved: false };
  }
}
export function hydrateStudio() {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const p = studioSchema.safeParse(JSON.parse(raw));
      if (p.success)
        state = { ...state, design: p.data, selected: p.data.sections[0]!.id, saved: true };
    }
  } catch {}
  emit();
}
export function selectSection(id: string) {
  state = { ...state, selected: id };
  emit();
}
export function changeDesign(patch: Partial<StudioDesign>) {
  const parsed = studioSchema.safeParse({ ...state.design, ...patch });
  if (!parsed.success) return;
  state = {
    ...state,
    design: parsed.data,
    undo: gestureStart ? state.undo : [...state.undo, state.design].slice(-50),
    redo: [],
  };
  if (!state.design.sections.some((s) => s.id === state.selected))
    state.selected = state.design.sections[0]!.id;
  persist();
  emit();
}
export function editSection(id: string, patch: Partial<Section>) {
  changeDesign({
    sections: state.design.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });
}
export function stepHistory(back: boolean) {
  const from = back ? state.undo : state.redo;
  if (!from.length) return;
  const next = from[from.length - 1]!;
  state = {
    ...state,
    design: next,
    undo: back ? state.undo.slice(0, -1) : [...state.undo, state.design],
    redo: back ? [...state.redo, state.design] : state.redo.slice(0, -1),
  };
  if (!next.sections.some((s) => s.id === state.selected)) state.selected = next.sections[0]!.id;
  persist();
  emit();
}
export const studio = {
  get current() {
    return state;
  },
};
export function useStudio() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => state,
    () => state,
  );
}
