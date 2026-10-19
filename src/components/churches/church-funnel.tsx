import { useEffect } from "react";
import logo from "@/assets/axis-displays-logo.png";
import { churchFunnel as copy, quizCopy } from "@/config/church-funnel";
import { startPixel } from "@/lib/meta-pixel";
import "./church-funnel.css";
export function FunnelHeader() {
  return (
    <header>
      <a href="/churches/" aria-label="Axis Displays church LED walls">
        <img src={logo} alt="Axis Displays" />
      </a>
      <span>CHURCH LED WALLS</span>
    </header>
  );
}
export function ChurchFunnel() {
  useEffect(() => {
    startPixel();
  }, []);
  return (
    <main className="church-funnel cf-watch">
      <FunnelHeader />
      <section className="cf-watch-content">
        <p className="cf-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="cf-watch-intro">{quizCopy.intro}</p>
        <div className="cf-video">
          {copy.videoUrl ? (
            <video
              controls
              preload="none"
              src={copy.videoUrl}
              aria-label="Axis church LED wall walkthrough"
            />
          ) : (
            <div className="cf-video-placeholder">
              <span>AXIS / INSIDE THE INSTALL</span>
              <h2>{copy.videoPlaceholder}</h2>
              <p>{quizCopy.videoPlaceholder}</p>
            </div>
          )}
        </div>
        <a className="cf-button" href="/churches/quiz/">
          {quizCopy.cta} <span aria-hidden="true">↗</span>
        </a>
        <p className="cf-small">{quizCopy.ctaNote}</p>
      </section>
    </main>
  );
}
