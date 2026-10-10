import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { GlassCard } from './glass';
import { panelOverview, site, storySteps } from '@/config/site';
import { setScene, useSceneState } from './scene/store';

export function PanelStory() {
  const { enabled, ready } = useSceneState();
  const visual = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);
  const selectedRef = useRef<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const pose = useCallback((step: number) => setScene({ step, stepChangedAt: performance.now() }), []);
  const play = useCallback(() => {
    clear(); started.current = true; selectedRef.current = null; setSelected(null); setPlaying(true); pose(0);
    // A single introduction, independent of scroll speed. Visitors can leave at any time.
    timers.current = [
      setTimeout(() => pose(3), 500),
      setTimeout(() => pose(4), 1800),
      setTimeout(() => pose(0), 4200),
      setTimeout(() => { setPlaying(false); timers.current = []; }, 5600),
    ];
  }, [clear, pose]);
  useEffect(() => {
    const target = visual.current;
    if (!target || !enabled || !ready) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry && entry.intersectionRatio >= 0.5) {
        if (!started.current && !document.hidden) play();
      } else {
        clear(); setPlaying(false);
        if (selectedRef.current === null) pose(0);
      }
    }, { threshold: [0, 0.5] });
    observer.observe(target);
    const hide = () => { if (document.hidden) { clear(); setPlaying(false); if (selectedRef.current === null) pose(0); } };
    document.addEventListener('visibilitychange', hide);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', hide); clear(); };
  }, [enabled, ready, play, clear, pose]);
  const choose = (step: number) => {
    clear(); started.current = true; setPlaying(false); selectedRef.current = step; setSelected(step); pose(step);
  };
  const detail = selected === null ? null : storySteps[selected];
  return <section id="inside" className="section-axis panel-overview" aria-label={site.labels.story}>
    <div className="container-axis panel-overview-grid">
      <div className="panel-overview-copy">
        <span className="eyebrow eyebrow-accent">{site.labels.engineered}</span>
        <h2 className="section-heading">{panelOverview.intro}</h2>
        <p className="panel-overview-intro">{panelOverview.description}</p>
        <div className="panel-benefits">{panelOverview.benefits.map((benefit, i) => <div className="panel-benefit" key={benefit.title}>
          <span className="panel-benefit-number" aria-hidden="true">0{i + 1}</span>
          <div><h3>{benefit.title}</h3><p>{benefit.text}</p><span className="panel-benefit-detail">{benefit.detail}</span></div>
        </div>)}</div>
      </div>
      {enabled === true && <div className="panel-explorer">
        <div className="panel-overview-visual" data-scene-anchor="story" ref={visual}>
          {!ready && <div className="scene-loader"><span className="loader-ring" /><span>POWERING UP</span></div>}
        </div>
        <div className="panel-explorer-controls">
          <span className="eyebrow">{panelOverview.explore}</span>
          <div className="panel-view-buttons">{panelOverview.views.map(view => <button type="button" key={view.step} aria-pressed={selected === view.step} onClick={() => choose(view.step)}>{view.label}<ArrowUpRight size={13} aria-hidden="true" /></button>)}</div>
          <div className="panel-explorer-caption">
            <p aria-live="polite">{detail ? detail.text : playing ? panelOverview.playing : site.copy.insideIntro}</p>
            <button className="panel-replay" type="button" onClick={play} disabled={!ready}><RotateCcw size={14} aria-hidden="true" />{panelOverview.replay}</button>
          </div>
        </div>
      </div>}
      {enabled !== true && <GlassCard className="panel-static-summary"><span className="eyebrow eyebrow-accent">{site.labels.series}</span><h3>{site.copy.inside}</h3><p>{site.copy.insideIntro}</p></GlassCard>}
    </div>
  </section>;
}
