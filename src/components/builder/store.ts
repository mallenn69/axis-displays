import { useSyncExternalStore } from 'react';
import { defaultSelections, type BuilderSelections } from '@/config/builder';

export type BuilderState = BuilderSelections & {
  step: number; camera: string; cameraNonce: number; dims: boolean; playing: boolean; introDone: boolean;
  flash: number; shift: { dx: number; dy: number; n: number }; hover: string; venueChangedAt: number; contentChangedAt: number; pitchChangedAt: number; shakeAt: number; ready: boolean;
};
let state: BuilderState = { ...defaultSelections, step: 0, camera: 'back', cameraNonce: 0, dims: false, playing: false, introDone: false, flash: 0, shift: { dx: 0, dy: 0, n: 0 }, hover: '', venueChangedAt: 0, contentChangedAt: 0, pitchChangedAt: 0, shakeAt: 0, ready: false };
const ls = new Set<() => void>();
export const builder = { get current() { return state; } };
export function setBuilder(p: Partial<BuilderState> | ((s: BuilderState) => Partial<BuilderState>)) {
  const patch = typeof p === 'function' ? p(state) : p;
  state = { ...state, ...patch }; ls.forEach(l => l());
}
const sub = (l: () => void) => { ls.add(l); return () => { ls.delete(l); }; };
const get = () => state;
export function useBuilder() { return useSyncExternalStore(sub, get, get); }
export function selectionsOf(s: BuilderState): BuilderSelections {
  const { venue, room, pitch, cols, rows, layout, brightness, lighting, content, mount, extras, viewingFt, holes, sideCols } = s;
  return { venue, room, pitch, cols, rows, layout, brightness, lighting, content, mount, extras, viewingFt, holes, sideCols };
}
