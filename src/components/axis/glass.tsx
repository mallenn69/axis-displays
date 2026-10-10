import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode, type ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export function GlassCard({ children, className, tilt = false }: { children: ReactNode; className?: string; tilt?: boolean }) {
 const reduced = useReducedMotion();
 return <motion.div className={cn('glass-card', className)} whileHover={tilt && !reduced ? { borderColor: 'var(--blue-edge)' } : {}} transition={{ duration: .3, ease: [.65, 0, .35, 1] }}>{children}</motion.div>;
}
export function GlassButton({ primary = false, className, ...props }: ComponentProps<typeof Button> & { primary?: boolean }) { return <Button variant={primary ? 'axis' : 'glass'} className={className} {...props} />; }
export function Reveal({ children, className }: { children: ReactNode; className?: string }) { const reduced = useReducedMotion(); return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: .65, ease: [.65, 0, .35, 1] }}>{children}</motion.div>; }
