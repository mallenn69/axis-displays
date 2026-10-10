import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import visual from '@/assets/led-visual.jpg';
export function LedWall({ compact = false }: { compact?: boolean }) {
 const reduced = useReducedMotion(); const ref = useRef<HTMLDivElement>(null); const visible = useInView(ref);
 return <div ref={ref} className={`led-scene ${compact ? 'compact' : ''}`}>
 <motion.div className="led-wall"><motion.img className="led-art" src={visual} width={1920} height={1024} alt="Electric blue flowing visuals displayed across a modular Axis LED video wall" animate={reduced || !visible ? false : { scale: [1,1.08,1], x: ['0%','-2%','0%'] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
 <div className="tile-grid">{Array.from({ length: 72 },(_,i)=><motion.span className="led-tile" key={i} initial={reduced ? false : { backgroundColor: 'var(--background)' }} animate={{ backgroundColor: 'var(--transparent)' }} transition={{ delay: .35 + (i%12)*.055 + Math.floor(i/12)*.045, duration: .5 }} />)}</div><div className="pixel-mesh" /></motion.div><div className="led-reflection"><img src={visual} alt="" aria-hidden="true" /></div></div>;
}
