import { createFileRoute } from '@tanstack/react-router';
import { DarkConcept } from '@/components/concept/dark-concept';
export const Route = createFileRoute('/concept')({
  head: () => ({ meta: [{ title: 'Axis Displays — LED Video Walls' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: DarkConcept,
});
