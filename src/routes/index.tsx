import { createFileRoute } from '@tanstack/react-router';
import { Navigation, Footer } from '@/components/axis/navigation';
import { AmbientEffects, Hero, TrustMarquee, SpecsSection, WhyAxis, Installs, Testimonial, CtaBanner } from '@/components/axis/home-sections';
import { PanelStory } from '@/components/axis/panel-story';
import { BuildTeaser } from '@/components/axis/build-teaser';
import { SceneHost } from '@/components/axis/scene/scene-host';
import { QuoteForm } from '@/components/axis/quote-form';
export const Route=createFileRoute('/')({
 head:()=>({meta:[{title:'Axis Displays | LED Video Walls for Churches'},{name:'description',content:'Premium LED video walls for churches without the premium price. Axis designs, installs, and supports camera-ready LED walls built for worship.'},{property:'og:title',content:'Axis Displays | LED Video Walls for Churches'},{property:'og:description',content:'Premium LED walls without the premium price. Designed, installed, and supported for your church stage.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Index,
});
function Index(){return <div className="site-shell"><AmbientEffects/><SceneHost/><Navigation/><main><Hero/><TrustMarquee/><PanelStory/><BuildTeaser/><div className="beam-divider"/><SpecsSection/><WhyAxis/><Installs/><Testimonial/><CtaBanner/><QuoteForm/></main><Footer/></div>;}
