import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { GlassCard, GlassButton, Reveal } from './glass';
import { buildTeaser } from '@/config/site';
import { useSceneState } from './scene/store';

export function BuildTeaser() {
  const { enabled } = useSceneState();
  return <section id="build-teaser" className="section-axis build-teaser"><div className="container-axis build-teaser-grid">
    <Reveal><GlassCard className="build-teaser-card"><span className="eyebrow eyebrow-accent">{buildTeaser.eyebrow}</span><h2 className="section-heading">{buildTeaser.title}</h2><p>{buildTeaser.text}</p><GlassButton primary asChild><Link to="/build">{buildTeaser.button}<ArrowUpRight /></Link></GlassButton></GlassCard></Reveal>
    <div className="build-teaser-visual" data-scene-anchor="build">{enabled === false && <div className="teaser-grid-static" aria-hidden="true">{Array.from({ length: 32 }, (_, i) => <span key={i} />)}</div>}</div>
  </div></section>;
}
