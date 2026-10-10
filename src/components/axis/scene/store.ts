import { useSyncExternalStore } from 'react';

export type SceneSection = 'none' | 'story' | 'build' | 'quote';
export type SceneSnapshot = {
  section: SceneSection;
  step: number;
  /** performance.now() timestamp of the last step change */
  stepChangedAt: number;
  ready: boolean;
  mobile: boolean;
  /** null until detected on the client */
  enabled: boolean | null;
};

let snapshot: SceneSnapshot = { section: 'none', step: 0, stepChangedAt: 0, ready: false, mobile: false, enabled: null };
const listeners = new Set<() => void>();

/** Live, mutable-read access for render loops. */
export const sceneState = { get current() { return snapshot; } };

export function setScene(patch: Partial<SceneSnapshot>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof SceneSnapshot)[]) if (snapshot[k] !== patch[k]) changed = true;
  if (!changed) return;
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(l => l());
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
const get = () => snapshot;
export function useSceneState() { return useSyncExternalStore(subscribe, get, get); }
