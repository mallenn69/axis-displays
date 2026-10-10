import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ArrowDown, ArrowUpRight, Minus, Plus, RotateCcw, Menu, X } from 'lucide-react';
import { concept } from '@/config/concept';
import { projects } from '@/config/projects';
import { specs } from '@/config/specs';
import { formFields, quoteSchema } from '@/config/quote';
import { submitQuote } from '@/lib/quotes.functions';
import { SceneHost } from '@/components/axis/scene/scene-host';
import { setScene, useSceneState } from '@/components/axis/scene/store';
import './concept.css';
import { SceneBrand } from '@/components/axis/scene/scene-brand';

const CONCEPT_SCENES: [string, 'story'][] = [['inside', 'story']];
function Wordmark() { return <span className="ai-wordmark">AFTER<span className="ai-mark" aria-hidden="true">✳</span>IMAGE<span className="ai-wordmark-dot">01</span></span>; }
function Action({ children, href, light = false }: { children: React.ReactNode; href: string; light?: boolean }) { return <a className={`ai-action ${light ? 'ai-action-light' : ''}`} href={href}>{children}<ArrowUpRight size={22}/></a>; }
export function ConceptSite() {
  const [menu, setMenu] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('ai-visible'); observer.unobserve(entry.target); } }), { threshold: .08 });
    shell.current?.querySelectorAll('.ai-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return <SceneBrand.Provider value="AFTERIMAGE"><div className="ai-site" ref={shell}><SceneHost sections={CONCEPT_SCENES}/>
    <a className="ai-skip" href="#ai-main">Skip to content</a>
    <header className="ai-nav"><a href="#" aria-label="Afterimage home"><Wordmark/></a><nav aria-label="Main navigation" className={menu ? 'ai-menu-open' : ''}>
      {[['The panel', '#inside'], ['The possibilities', '#ai-spaces'], ['Build a wall', '#build-teaser']].map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}</a>)}<a className="ai-nav-quote" href="#quote" onClick={() => setMenu(false)}>Let’s talk <ArrowUpRight size={17}/></a></nav>
      <button className="ai-menu-button" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></header>
    <main id="ai-main">
      <section className="ai-hero"><div className="ai-hero-meta"><span>LIGHT. WITH LASTING IMPACT.</span><span>LED DISPLAY SYSTEMS / 001</span></div>
        <h1><span>{concept.hero.first}</span><span className="ai-hero-middle">{concept.hero.second}<i>feel something.</i></span><span>{concept.hero.third}</span></h1>
        <div className="ai-hero-art"><div className="ai-hero-photo" role="img" aria-label="Illustrative worship stage with an immersive LED wall" style={{ backgroundImage: `url(${projects[1]!.image})` }}/><span className="ai-art-caption">A SMALL PANEL.<br/>AN ENTIRELY NEW PERSPECTIVE.</span><span className="ai-art-cross" aria-hidden="true">+</span></div>
        <div className="ai-hero-bottom"><a className="ai-scroll" href="#ai-intro"><ArrowDown size={20}/> SCROLL TO SEE THE BIGGER PICTURE</a><div><p>{concept.hero.text}</p><Action href="#build-teaser">Create your canvas</Action></div></div>
      </section>
      <section id="ai-intro" className="ai-intro ai-reveal"><span className="ai-kicker">01 / THE IDEA</span><h2>A wall is just a wall.<br/>Until you <em>bring it to life.</em></h2><div className="ai-intro-bottom"><span className="ai-orbit" aria-hidden="true">✳</span><p>Your next Sunday. Your biggest gathering. The moment everyone remembers. We make modular LED systems that turn your space into something people can feel.</p></div></section>
      <PanelExplorer/>
      <section className="ai-specs ai-reveal"><div className="ai-section-top"><span className="ai-kicker">THE DETAILS MAKE THE DIFFERENCE</span><span>SPECIFICATION STUDY — VALUES TO BE CONFIRMED</span></div><div className="ai-spec-grid">{specs.map(spec => <div key={spec.label}><span>{spec.label}</span><strong>{'display' in spec ? spec.display : spec.value}<small>{spec.suffix}</small></strong><p>{spec.note}</p></div>)}</div></section>
      <WallStudy/>
      <section id="ai-spaces" className="ai-spaces"><div className="ai-section-top ai-reveal"><span className="ai-kicker">04 / IN THE ROOM</span><span>ILLUSTRATIVE INSTALLATIONS</span></div><h2 className="ai-reveal">Different spaces.<br/><em>Same goosebumps.</em></h2><div className="ai-project-grid">{projects.map((project, i) => <figure className={`ai-project ai-project-${i} ai-reveal`} key={project.name}><img src={project.image} alt={`Illustrative LED installation: ${project.description}`} loading="lazy"/><figcaption><div><span>0{i + 1} / {['THE SANCTUARY', 'THE GATHERING', 'THE COMMUNITY'][i]}</span><strong>{project.size} <small>LED CANVAS</small></strong></div><a href="#quote" aria-label={`Discuss a wall like illustration ${i + 1}`}><ArrowUpRight/></a></figcaption></figure>)}</div></section>
      <section id="ai-support" className="ai-support"><div className="ai-support-heading ai-reveal"><span className="ai-kicker">05 / THE PEOPLE BEHIND THE PIXELS</span><h2>Good hardware.<br/><em>Better humans.</em></h2><p>From the first sketch to the last cable. And every Sunday after.</p></div><div>{concept.support.map(([num, title, text]) => <article className="ai-support-row ai-reveal" key={num}><span>{num}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={28}/></article>)}</div></section>
      <ConceptQuote/>
    </main><footer className="ai-footer"><div><Wordmark/><span>A NEW PERSPECTIVE.</span></div><div><span>DESIGN CONCEPT / BRAND NAME EXPLORATION</span><a href="/admin">Admin <ArrowUpRight size={14}/></a><a href="/">Previous direction <ArrowUpRight size={14}/></a><a href="#">Back to top ↑</a></div></footer>
  </div></SceneBrand.Provider>;
}
function PanelExplorer() {
  const { enabled, ready } = useSceneState();
  const [selected, setSelected] = useState(1);
  const choose = (index: number) => { setSelected(index); setScene({ step: concept.features[index]!.step, stepChangedAt: performance.now() }); };
  useEffect(() => { setScene({ step: 3, stepChangedAt: performance.now() }); }, []);
  return <section id="inside" className="ai-panel"><div className="ai-section-top"><span className="ai-kicker">02 / MEET THE BUILDING BLOCK</span><span>SMALL BY DESIGN. BIG BY NATURE.</span></div><div className="ai-panel-grid"><div className="ai-panel-copy ai-reveal"><h2>Beautiful<br/>from <em>every</em><br/>angle.</h2><p>One cabinet. Endless possibility.<br/>Take a closer look at what makes it work.</p><div className="ai-panel-tabs" role="group" aria-label="Panel detail views">{concept.features.map((feature, i) => <button key={feature.title} aria-pressed={selected === i} onClick={() => choose(i)}><span>0{i + 1}</span>{feature.label}<ArrowUpRight size={18}/></button>)}</div></div><div className="ai-panel-stage"><div data-scene-anchor="story" className="ai-panel-anchor" aria-label="Interactive panel model">{enabled !== true ? <div className="ai-static-panel" aria-label="Static LED cabinet illustration"><span>AFTERIMAGE</span></div> : !ready && <span className="ai-model-loading">LOADING THE PANEL</span>}</div><span className="ai-panel-measure">MODULAR CABINET / 500 × 500 MM*</span><div className="ai-panel-detail" aria-live="polite"><h3>{concept.features[selected]!.title}</h3><p>{concept.features[selected]!.text}</p></div></div></div></section>;
}
function WallStudy() {
  const [cols, setCols] = useState(8), [rows, setRows] = useState(4), [shape, setShape] = useState('Full'), [removed, setRemoved] = useState<number[]>([]);
  const shapeRemoved = (index: number) => shape === 'Split' && index % cols === Math.floor(cols / 2) || shape === 'Stepped' && index < cols && (index % cols === 0 || index % cols === cols - 1);
  const active = Array.from({ length: cols * rows }, (_, i) => i).filter(i => !removed.includes(i) && !shapeRemoved(i));
  const resize = (value: number, setter: (n: number) => void) => { setter(value); setRemoved([]); };
  return <section id="build-teaser" className="ai-builder"><div className="ai-section-top"><span className="ai-kicker">03 / MAKE ROOM FOR YOUR VISION</span><span>YOUR SPACE. YOUR RULES.</span></div><div className="ai-builder-heading ai-reveal"><h2>Think bigger.<br/><em>Build yours.</em></h2><p>Wide. Tall. A little unconventional.<br/>Start with a shape. See where it takes you.</p></div><div className="ai-builder-body"><div className="ai-wall-room"><div className="ai-wall" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols}/${rows}`, width: `${Math.min(90, cols * 9)}%` }}>{Array.from({ length: cols * rows }, (_, i) => <button key={i} className={active.includes(i) ? '' : 'ai-cell-off'} aria-label={`${active.includes(i) ? 'Remove' : 'Restore'} cabinet, row ${Math.floor(i / cols) + 1}, column ${i % cols + 1}`} aria-pressed={active.includes(i)} disabled={shapeRemoved(i)} onClick={() => setRemoved(removed.includes(i) ? removed.filter(n => n !== i) : [...removed, i])} style={{ backgroundPosition: `${(i % cols) / Math.max(cols - 1, 1) * 100}% ${Math.floor(i / cols) / Math.max(rows - 1, 1) * 100}%`, backgroundSize: `${cols * 100}% ${rows * 100}%` }}/>)}</div><div className="ai-stage-line"/><span className="ai-room-caption">CLICK A CABINET TO EDIT YOUR CANVAS</span><span className="ai-person" aria-hidden="true">●<br/>┃<br/>╱╲</span></div><div className="ai-builder-controls"><span className="ai-kicker">THE CANVAS</span>{[['Columns', cols, setCols], ['Rows', rows, setRows]].map(([label, value, setter]) => <div className="ai-stepper" key={String(label)}><span>{String(label)}</span><div><button aria-label={`Decrease ${String(label).toLowerCase()}`} disabled={Number(value) <= 1} onClick={() => resize(Number(value) - 1, setter as (n: number) => void)}><Minus size={18}/></button><output aria-live="polite">{String(value)}</output><button aria-label={`Increase ${String(label).toLowerCase()}`} disabled={Number(value) >= 12} onClick={() => resize(Number(value) + 1, setter as (n: number) => void)}><Plus size={18}/></button></div></div>)}<div className="ai-shapes">{['Full', 'Split', 'Stepped'].map(item => <button aria-pressed={shape === item} key={item} onClick={() => { setShape(item); setRemoved([]); }}>{item}</button>)}</div><div className="ai-wall-total"><strong>{active.length}</strong><span>CABINETS<br/>{(cols * .5).toFixed(1)} × {(rows * .5).toFixed(1)} M*</span></div><button className="ai-reset" onClick={() => { setCols(8); setRows(4); setShape('Full'); setRemoved([]); }}><RotateCcw size={14}/> Reset canvas</button><Action href="/build">Open full configurator</Action><small>*Concept dimensions. Full configurator opens the existing build experience; this sketch is not transferred.</small></div></div></section>;
}
function ConceptQuote() {
  const submit = useServerFn(submitQuote);
  const [errors, setErrors] = useState<Record<string, string>>({}), [status, setStatus] = useState('idle');
  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = quoteSchema.safeParse(values);
    if (!parsed.success) { const next: Record<string,string> = {}; parsed.error.issues.forEach(issue => { next[String(issue.path[0])] = issue.message; }); setErrors(next); const field = event.currentTarget.elements.namedItem(String(parsed.error.issues[0]!.path[0])); if (field instanceof HTMLElement) field.focus(); return; }
    setErrors({}); setStatus('sending');
    try { await submit({ data: values }); setStatus('success'); } catch { setStatus('error'); }
  }
  return <section id="quote" className="ai-quote"><div className="ai-quote-copy ai-reveal"><span className="ai-kicker">06 / START SOMETHING</span><h2>Let’s make<br/><em>an impact.</em><ArrowUpRight aria-hidden="true"/></h2><p>Tell us about your space. We’ll help you see what’s possible.</p><span className="ai-quote-note">NO PRESSURE. JUST POSSIBILITIES.</span></div><div className="ai-quote-form">{status === 'success' ? <div role="status"><h3>The first pixel is yours.</h3><p>Your request is saved. The team will be in touch.</p></div> : <form onSubmit={handle} noValidate><div className="ai-fields">{formFields.map(field => <div key={field.name} className={field.wide ? 'ai-field-wide' : ''}><label htmlFor={`ai-${field.name}`}>{field.label}{field.required ? ' *' : ''}</label>{field.options ? <select id={`ai-${field.name}`} name={field.name} defaultValue="" required={field.required} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `ai-${field.name}-error` : undefined}><option value="">Select an option</option>{field.options.map(option => <option key={option}>{option}</option>)}</select> : field.multiline ? <textarea id={`ai-${field.name}`} name={field.name} maxLength={3000}/> : <input id={`ai-${field.name}`} name={field.name} type={field.type || 'text'} required={field.required} maxLength={field.name === 'email' ? 255 : 150} min={field.type === 'number' ? 1 : undefined} max={field.type === 'number' ? 1000 : undefined} autoComplete={field.name === 'name' ? 'name' : field.name === 'email' ? 'email' : field.name === 'phone' ? 'tel' : undefined} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `ai-${field.name}-error` : undefined}/>} {errors[field.name] && <span className="ai-error" id={`ai-${field.name}-error`}>{errors[field.name]}</span>}</div>)}</div><div className="honeypot" aria-hidden="true"><label htmlFor="ai-website">Website</label><input id="ai-website" name="website" tabIndex={-1} autoComplete="off" defaultValue=""/></div>{status === 'error' && <p role="alert">Couldn’t save your request. Please try again.</p>}<button className="ai-action" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Start the conversation'}<ArrowUpRight/></button><p className="ai-form-note">Design prototype. Submissions use the existing inquiry system.</p></form>}</div></section>;
}
