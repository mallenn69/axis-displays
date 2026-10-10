import { createFileRoute } from '@tanstack/react-router';
import { Configurator } from '@/components/builder/configurator';

export const Route = createFileRoute('/build')({
  head: () => ({ meta: [
    { title: 'Build Your Wall | Axis Displays' },
    { name: 'description', content: 'Configure your church LED video wall in 3D: venue, pixel pitch, size, layout, lighting, content and mounting — then get a quote.' },
    { property: 'og:title', content: 'Build Your Wall | Axis Displays' },
    { property: 'og:description', content: 'Design your LED video wall in an interactive 3D sanctuary and get a quote for your exact build.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Configurator,
});
