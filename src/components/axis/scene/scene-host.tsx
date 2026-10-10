import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { setScene, useSceneState, type SceneSection } from './store';

const AxisScene = lazy(() => import('./axis-scene'));
const SECTIONS: [string, SceneSection][] = [['inside', 'story'], ['build-teaser', 'build'], ['quote', 'quote']];

/** Detects WebGL support and tracks which 3D-enabled section is on screen. */
export function SceneHost({ sections = SECTIONS }: { sections?: [string, SceneSection][] }) {
  const { enabled, mobile } = useSceneState();
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = document.getElementById('inside'); if (!el) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setNear(true); observer.disconnect(); } }, { rootMargin: '400px' });
    observer.observe(el); return () => observer.disconnect();
  }, [enabled, mobile]);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let webgl = false;
    try { const gl = document.createElement('canvas').getContext('webgl2'); webgl = Boolean(gl); gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { webgl = false; }
    const resize = () => setScene({ mobile: window.innerWidth < 768 });
    resize();
    const preference = () => setScene({ enabled: webgl && !reduced.matches });
    preference();
    reduced.addEventListener('change', preference);
    const track = () => {
      const vh = window.innerHeight; let best: SceneSection = 'none', bestPx = 0;
      for (const [id, name] of sections) {
        const r = document.getElementById(id)?.getBoundingClientRect(); if (!r) continue;
        if (name === 'quote' && window.innerWidth < 768) continue;
        const px = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (px > bestPx) { bestPx = px; best = name; }
      }
      setScene({ section: bestPx > vh * 0.15 ? best : 'none' });
    };
    track();
    window.addEventListener('scroll', track, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('resize', track);
    return () => { reduced.removeEventListener('change', preference); window.removeEventListener('scroll', track); window.removeEventListener('resize', resize); window.removeEventListener('resize', track); };
  }, [sections]);
  if (!enabled || !near) return null;
  return <ClientOnly fallback={null}><SceneBoundary><Suspense fallback={null}><AxisScene /></Suspense></SceneBoundary></ClientOnly>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { setScene({ enabled: false, ready: false }); }
  override render() { return this.state.failed ? null : this.props.children; }
}
