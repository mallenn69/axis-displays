import { useEffect, type RefObject } from "react";

/** Updates only visible scenes, once per frame, without React render churn. */
export function useScrollMotion(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scenes = [...el.querySelectorAll<HTMLElement>("[data-scroll-scene]")];
    const active = new Set<HTMLElement>();
    let frame = 0;
    const draw = () => {
      frame = 0;
      if (preference.matches || document.hidden) return;
      const height = window.innerHeight;
      for (const scene of active) {
        const bounds = scene.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (height - bounds.top) / (height + bounds.height)));
        scene.style.setProperty("--scroll-progress", progress.toFixed(4));
      }
    };
    const schedule = () => {
      if (!frame && !preference.matches && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const scene = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            active.add(scene);
            scene.classList.add("dc-scroll-active");
          } else {
            active.delete(scene);
            scene.classList.remove("dc-scroll-active");
          }
        }
        schedule();
      },
      { rootMargin: "100px" },
    );
    scenes.forEach((scene) => observer.observe(scene));
    const reset = () => {
      if (preference.matches)
        scenes.forEach((scene) => scene.style.removeProperty("--scroll-progress"));
      else schedule();
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    preference.addEventListener("change", reset);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
      preference.removeEventListener("change", reset);
    };
  }, [root]);
}
