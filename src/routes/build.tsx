import { createFileRoute } from '@tanstack/react-router';
import { StageDesigner } from '@/components/builder/stage-designer';

export const Route = createFileRoute('/build')({
  head: () => ({ meta: [
    { title: 'Build Your Wall | Axis Displays' },
    { name: 'description', content: 'Arrange LED screens, columns and overhead panels for your stage, preview content, and plan your quote.' },
    { property: 'og:title', content: 'Build Your Wall | Axis Displays' },
    { property: 'og:description', content: 'Create your LED wall layout with the Axis Displays wall designer.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: StageDesigner,
});
