import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Play, Pause } from "lucide-react";
import { projects } from "@/config/projects";
import { specs } from "@/config/specs";
import { darkLanding } from "@/config/dark-landing";
import { QuoteForm } from "@/components/axis/quote-form";

export function LandingExpansion() {
  const root = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          entry.target.classList.toggle("dc-in-view", entry.isIntersecting);
          if (entry.isIntersecting) entry.target.classList.add("dc-revealed");
        }),
      { threshold: 0.12 },
    );
    root.current
      ?.querySelectorAll(".dc-reveal,.dc-motion-section")
      .forEach((el) => observer.observe(el));
    const visibility = () => root.current?.classList.toggle("dc-page-hidden", document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const image = projects[project]!;
  return (
    <div ref={root}>
      <section className="dc-spec-strip dc-reveal">
        <span className="dc-section-label">THE DETAILS</span>
        <div>
          {specs.slice(0, 4).map((spec) => (
            <article key={spec.label}>
              <strong>
                {spec.value}
                <small>{spec.suffix}</small>
              </strong>
              <span>{spec.label}</span>
            </article>
          ))}
        </div>
        <p>{darkLanding.specNote}</p>
      </section>
      <section
        className="dc-immersion dc-motion-section"
        id="possibilities"
        data-scroll-scene="gallery"
      >
        <div className="dc-section-label">
          <span>02 / THE EXPERIENCE</span>
          <span>{darkLanding.galleryNote}</span>
        </div>
        <div className="dc-immersion-heading dc-reveal">
          <h2>
            {darkLanding.experience.title}
            <br />
            <span>{darkLanding.experience.accent}</span>
          </h2>
          <p>{darkLanding.experience.text}</p>
        </div>
        <div className={`dc-install-image ${playing ? "dc-install-playing" : ""}`}>
          <img
            key={image.image}
            src={image.image}
            alt={image.description}
            width={1152}
            height={648}
            decoding="async"
            loading="lazy"
          />
          <div className="dc-install-overlay">
            <span>
              0{project + 1} / {darkLanding.spaces[project]}
            </span>

          </div>
          <button
            className="dc-motion-toggle"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause scene motion" : "Play scene motion"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
        <div className="dc-project-controls" role="group" aria-label="Stage photo views">
          {darkLanding.spaces.map((space, i) => (
            <button key={space} aria-pressed={project === i} onClick={() => setProject(i)}>
              <span>0{i + 1}</span>
              {space}
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      </section>
      <div className="dc-quote-wrap">
        <QuoteForm />
      </div>
    </div>
  );
}
