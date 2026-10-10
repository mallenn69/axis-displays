import wide from '@/assets/axis-stage-wide.jpg';
import close from '@/assets/axis-stage-close.jpg';
import audience from '@/assets/axis-stage-audience.jpg';
// Supplied photography; venue, product specifications and installation credits are unconfirmed.
export const projects = [
  { name: 'The full stage', location: '', size: '', pitch: '', image: wide, gallery: [wide, close, audience], description: 'A wide view of the stage, with an LED backdrop and overhead displays during a live service.' },
  { name: 'Up close', location: '', size: '', pitch: '', image: close, gallery: [close, wide, audience], description: 'Performers on stage in front of a bright LED backdrop and overhead display panels.' },
  { name: 'From the room', location: '', size: '', pitch: '', image: audience, gallery: [audience, wide, close], description: 'The stage and LED displays viewed from the audience during a live service.' },
];
export type Project = (typeof projects)[number];
