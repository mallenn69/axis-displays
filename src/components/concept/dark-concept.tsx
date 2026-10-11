import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { SceneHost } from "@/components/axis/scene/scene-host";
import { setScene, useSceneState } from "@/components/axis/scene/store";
import { Logo } from "@/components/axis/logo";
import { SceneBrand } from "@/components/axis/scene/scene-brand";
import "./dark-concept.css";
import { useScrollMotion } from "./use-scroll-motion";
import { LandingExpansion } from "./landing-expansion";
import { darkConcept } from "@/config/dark-concept";
const scenes: [string, "story"][] = [["inside", "story"]];
export function DarkConcept() {
  const page = useRef<HTMLDivElement>(null);
  useScrollMotion(page);
  const [view, setView] = useState(0);
  const hero = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(false);
  const { enabled } = useSceneState();
  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    let visible = true;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const paused = !visible || document.hidden || preference.matches || videoPaused;
      el.classList.toggle("dc-motion-paused", paused);
      if (paused) video.current?.pause();
      else video.current?.play().catch(() => {});
    };
    preference.addEventListener("change", update);
    update();
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      update();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      preference.removeEventListener("change", update);
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [videoPaused]);
  useEffect(() => { setScene({ step: 0, stepChangedAt: performance.now() }); }, []);
  const views = darkConcept.views;
  const choose = (i: number) => {
    setView(i);
    setScene({ step: views[i]!.step, stepChangedAt: performance.now() });
  };
  return (
    <SceneBrand.Provider value="AXIS">
      <div className="dc-site" ref={page}>
        <SceneHost sections={scenes} />
        <header className="dc-nav">
          <a href="#" className="dc-logo" aria-label="Axis Displays home">
            <Logo />
          </a>
          <nav>
            <a href="#inside">The panel</a>
            <a href="#possibilities">The experience</a>
            <a href="#quote">
              Get in touch <ArrowUpRight size={16} />
            </a>
          </nav>
          <span className="dc-study">AXIS DISPLAYS</span>
        </header>
        <main>
          <section className="dc-hero dc-video-hero" ref={hero}>
            <video ref={video} className="dc-hero-video" muted loop playsInline preload="metadata" poster={`${import.meta.env.BASE_URL}media/axis-hero-poster.jpg`} aria-hidden="true">
              <source src={`${import.meta.env.BASE_URL}media/axis-hero.mp4`} type="video/mp4" />
            </video>
            <div className="dc-video-shade" aria-hidden="true" />
            <div className="dc-topline">
              <span>LED VIDEO WALLS</span>
              <span>
                <i /> DESIGN / INSTALL / SUPPORT
              </span>
            </div>
            <div className="dc-hero-title">
              <h1>
                {darkConcept.hero.title}
                <br />
                <span>{darkConcept.hero.accent}</span>
              </h1>
              <p>
                {darkConcept.hero.description[0]}
                <br />
                {darkConcept.hero.description[1]}
              </p>
            </div>
            <div className="dc-video-actions">
              <a className="dc-video-cta" href="#quote">{darkConcept.hero.cta}<ArrowUpRight size={30} /></a>
              <a className="dc-scroll" href="#inside"><ArrowDown size={17} /> Explore the panel</a>
            </div>
            <button className="dc-video-toggle" onClick={() => setVideoPaused(!videoPaused)} aria-label={videoPaused ? "Play background video" : "Pause background video"}>
              {videoPaused ? <Play size={17} /> : <Pause size={17} />}
            </button>
          </section>
          <section className="dc-panel" id="inside">
            <div className="dc-section-label">
              <span>01 / THE HARDWARE</span>
              <span>FRONT / BACK / INSIDE</span>
            </div>
            <div className="dc-panel-layout">
              <div className="dc-panel-copy">
                <h2>
                  {darkConcept.panel.title}
                  <br />
                  <span>
                    {darkConcept.panel.accent.join(" ")}
                  </span>
                </h2>
                <p>{darkConcept.panel.description}</p>
                <div className="dc-tabs" aria-label="Panel views">
                  {views.map((item, i) => (
                    <button
                      key={item.name}
                      aria-pressed={view === i}
                      disabled={enabled !== true}
                      onClick={() => choose(i)}
                    >
                      <span>0{i + 1}</span>
                      {item.name}
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
                <div className="dc-description" aria-live="polite">
                  <h3>{views[view]!.title}</h3>
                  <p>{views[view]!.text}</p>
                </div>
              </div>
              <div className="dc-panel-visual">
                <div className={`dc-panel-anchor ${view === 2 ? "dc-panel-exploded" : ""}`} data-scene-anchor="story">
                  {enabled !== true && (
                    <div className="dc-static-cabinet" aria-label="Static LED panel illustration">
                      <span>AXIS DISPLAYS</span>
                    </div>
                  )}
                  {view === 2 && enabled === true && <div className="dc-panel-callouts">
                    <svg aria-hidden="true">{views[2]!.features!.map((feature, i) => <g key={feature.title}><line data-panel-leader={i} x1={i === 0 ? '22%' : '78%'} y1={i === 2 ? '85%' : '17%'} x2={i === 0 ? '22%' : '78%'} y2={i === 2 ? '85%' : '17%'}/><circle data-panel-dot={i} r="3" /></g>)}</svg>
                    {views[2]!.features!.map((feature, i) => <div className={`dc-panel-callout dc-panel-callout-${i}`} key={feature.title}><strong>{feature.title}</strong>{feature.qualifier && <small>{feature.qualifier}</small>}</div>)}
                  </div>}
                </div>
                <span className="dc-corner dc-tl">+</span>
                <span className="dc-corner dc-tr">+</span>
                <span className="dc-corner dc-bl">+</span>
                <span className="dc-corner dc-br">+</span>
                <div className="dc-model-label">
                  <span>{darkConcept.panel.model.toUpperCase()}</span>
                  <span>
                    {enabled === true
                      ? "INTERACTIVE PRODUCT STUDY"
                      : "STATIC PREVIEW / MOTION UNAVAILABLE"}
                  </span>
                </div>
              </div>
            </div>
          </section>
          <LandingExpansion />
          <footer className="dc-footer">
            <span>AXIS DISPLAYS</span>
            <a href={import.meta.env['VITE_DESIGN_PREVIEW'] === "true" ? "#quote" : "/build"}>
              {import.meta.env['VITE_DESIGN_PREVIEW'] === "true" ? "Get in touch" : "Wall configurator"} <ArrowUpRight size={15} />
            </a>
            {import.meta.env['VITE_DESIGN_PREVIEW'] !== "true" && <a href="/admin">
              Admin <ArrowUpRight size={15} />
            </a>}
          </footer>
        </main>
      </div>
    </SceneBrand.Provider>
  );
}
