// TODO: confirm every product number with manufacturer before publication.
import { z } from 'zod';

export const cabinet = { widthMm: 500, heightMm: 500, weightKg: 7.5, maxWatts: 160, avgWatts: 55 };
export const brightnessRange = { min: 300, max: 1200, step: 50, default: 800 };

export const pitches = [
  { id: 'p1.9', mm: 1.9, label: 'P1.9', note: 'Ultra fine' },
  { id: 'p2.6', mm: 2.6, label: 'P2.6', note: 'Most popular' },
  { id: 'p3.9', mm: 3.9, label: 'P3.9', note: 'Large rooms' },
  { id: 'p4.8', mm: 4.8, label: 'P4.8', note: 'Outdoor ready' },
] as const;

export const venues = [
  { id: 'indoor', label: 'Indoor Sanctuary', note: 'Seats, stage, truss' },
  { id: 'outdoor', label: 'Outdoor Stage', note: 'Sky, roof, lawn' },
] as const;

export const roomSizes = [
  { id: 'small', label: 'Small Chapel', note: '~150 seats', scale: 0.75, rows: 5 },
  { id: 'mid', label: 'Mid Sanctuary', note: '~500 seats', scale: 1, rows: 8 },
  { id: 'large', label: 'Large Auditorium', note: '1,500+ seats', scale: 1.35, rows: 12 },
] as const;

export const sizeLimits = { minCols: 1, maxCols: 24, minRows: 1, maxRows: 12, minSide: 1, maxSide: 8 };
/** Quick shapes for the cabinet grid editor. Each returns the cells to leave empty. */
export const shapePresets = [
  { id: 'full', label: 'Full' },
  { id: 'notch', label: 'Center Notch' },
  { id: 'stepped', label: 'Stepped' },
  { id: 'split', label: 'Split' },
  { id: 'arch', label: 'Arch' },
] as const;
export const sizePresets = [
  { id: '169', label: '16:9', cols: 16, rows: 9 },
  { id: 'wide', label: 'Ultra-wide', cols: 21, rows: 6 },
  { id: 'fill', label: 'Fill the Stage', cols: 22, rows: 10 },
] as const;

export const layouts = [
  { id: 'single', label: 'Single Center Wall', note: 'Classic focal point' },
  { id: 'sides', label: 'Center + Side Walls', note: 'IMAG on both sides' },
  { id: 'panorama', label: 'Wide Panorama', note: 'Edge-to-edge canvas' },
  { id: 'curved', label: 'Curved Wall', note: 'Immersive arc' },
] as const;

export const indoorLighting = [
  { id: 'house', label: 'House Lights Up' },
  { id: 'dim', label: 'Dim' },
  { id: 'worship', label: 'Worship Mode' },
  { id: 'daylight', label: 'Daylight Windows' },
] as const;
export const outdoorLighting = [
  { id: 'midday', label: 'Midday Sun' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'night', label: 'Night' },
] as const;
/** Ambient light level per lighting state, 0..1 — used for the visible-quality indicator. */
export const ambientLevel: Record<string, number> = { house: 0.75, dim: 0.35, worship: 0.12, daylight: 0.9, midday: 1, sunset: 0.5, night: 0.08 };

export const contents = [
  { id: 'lyrics', label: 'Worship Lyrics' },
  { id: 'slides', label: 'Sermon Slides' },
  { id: 'motion', label: 'Motion Background' },
  { id: 'imag', label: 'Live Camera (IMAG)' },
  { id: 'announce', label: 'Announcements' },
] as const;
export const contentText = { lyrics: ['Placeholder lyric line one', 'Placeholder lyric line two'], slides: ['Sermon Title', 'Point one placeholder'], announce: ['This Week', 'Placeholder announcement'] };

export const mounts = [
  { id: 'ground', label: 'Ground-Stacked', note: 'Built on support frames' },
  { id: 'flown', label: 'Flown', note: 'Rigged from above' },
] as const;

export const extras = [
  { id: 'processor', label: 'Processor', note: 'Video processing rack' },
  { id: 'spares', label: 'Spare Modules', note: 'Road case on site' },
  { id: 'install', label: 'Installation', note: 'Certified crew' },
  { id: 'training', label: 'Training', note: 'Team walkthrough' },
  { id: 'support', label: 'Support Plan', note: 'Sunday Guarantee' },
] as const;

export const cameraViews = [
  { id: 'back', label: 'Back Row' },
  { id: 'center', label: 'Center Seat' },
  { id: 'stage', label: 'From the Stage' },
  { id: 'aerial', label: 'Aerial' },
  { id: 'side', label: 'Side Angle' },
] as const;

export const steps = [
  { id: 'venue', label: 'Venue', title: 'Where will it live?', text: 'Placeholder: pick your venue and room size.', camera: 'back' },
  { id: 'pitch', label: 'Pitch', title: 'Pixel pitch', text: 'Placeholder: smaller pitch, smoother image up close.', camera: 'center' },
  { id: 'size', label: 'Size', title: 'Wall size', text: 'Placeholder: set width and height in cabinets.', camera: 'center' },
  { id: 'layout', label: 'Layout', title: 'Layout', text: 'Placeholder: choose how the wall wraps your stage.', camera: 'aerial' },
  { id: 'light', label: 'Lighting', title: 'Brightness & lighting', text: 'Placeholder: tune brightness for your room.', camera: 'back' },
  { id: 'content', label: 'Content', title: 'Content preview', text: 'Placeholder: see what Sunday looks like.', camera: 'center' },
  { id: 'mount', label: 'Mounting', title: 'Mounting', text: 'Placeholder: stacked or flown.', camera: 'side' },
  { id: 'extras', label: 'Extras', title: 'Extras', text: 'Placeholder: add the essentials.', camera: 'side' },
  { id: 'review', label: 'Review', title: 'Your wall', text: 'Placeholder: here is your build.', camera: 'aerial' },
] as const;

export const builderCopy = {
  intro: "Let's build your wall", skip: 'Click to skip', loader: 'Powering up', getQuote: 'Get My Quote', share: 'Share This Build', copied: 'Link copied',
  playSunday: 'Play Sunday', stop: 'Stop', dimensions: 'Dimensions', next: 'Next', back: 'Back', viewing: 'Viewing distance', brightness: 'Brightness',
  quoteTitle: 'Get a quote for this wall', fallbackNote: '3D preview unavailable — showing a front view.',
};

export type BuilderSelections = {
  venue: (typeof venues)[number]['id']; room: (typeof roomSizes)[number]['id']; pitch: (typeof pitches)[number]['id'];
  cols: number; rows: number; layout: (typeof layouts)[number]['id']; brightness: number; lighting: string;
  content: (typeof contents)[number]['id']; mount: (typeof mounts)[number]['id']; extras: string[]; viewingFt: number;
  /** Empty grid cells as "col:row" (row 0 = bottom). */ holes: string[]; sideCols: number;
};
export const defaultSelections: BuilderSelections = { venue: 'indoor', room: 'mid', pitch: 'p2.6', cols: 12, rows: 7, layout: 'single', brightness: brightnessRange.default, lighting: 'worship', content: 'motion', mount: 'ground', extras: ['processor', 'install'], viewingFt: 30, holes: [], sideCols: 3 };

export const selectionsSchema = z.object({
  venue: z.enum(['indoor', 'outdoor']), room: z.enum(['small', 'mid', 'large']), pitch: z.enum(['p1.9', 'p2.6', 'p3.9', 'p4.8']),
  cols: z.number().int().min(sizeLimits.minCols).max(sizeLimits.maxCols), rows: z.number().int().min(sizeLimits.minRows).max(sizeLimits.maxRows),
  layout: z.enum(['single', 'sides', 'panorama', 'curved']), brightness: z.number().min(brightnessRange.min).max(brightnessRange.max),
  lighting: z.enum(['house', 'dim', 'worship', 'daylight', 'midday', 'sunset', 'night']), content: z.enum(['lyrics', 'slides', 'motion', 'imag', 'announce']),
  mount: z.enum(['ground', 'flown']), extras: z.array(z.enum(['processor', 'spares', 'install', 'training', 'support'])).max(5), viewingFt: z.number().min(5).max(150),
  holes: z.array(z.string().regex(/^\d{1,2}:\d{1,2}$/)).max(288), sideCols: z.number().int().min(sizeLimits.minSide).max(sizeLimits.maxSide),
});

export function pitchOf(s: BuilderSelections) { return pitches.find(p => p.id === s.pitch) ?? pitches[1]; }
/** Total cabinets, counting side walls for that layout. */
export function activeHoles(s: Pick<BuilderSelections, 'holes' | 'cols' | 'rows'>) { return s.holes.filter(h => { const [c, r] = h.split(':').map(Number); return c! < s.cols && r! < s.rows; }); }
export function cabinetCount(s: BuilderSelections) { return s.cols * s.rows - activeHoles(s).length + (s.layout === 'sides' ? 2 * s.sideCols * s.rows : 0); }
export function computeSummary(s: BuilderSelections) {
  const pitch = pitchOf(s).mm;
  const pxW = Math.floor(cabinet.widthMm / pitch), pxH = Math.floor(cabinet.heightMm / pitch);
  const count = cabinetCount(s);
  const widthFt = (s.cols * cabinet.widthMm) / 304.8, heightFt = (s.rows * cabinet.heightMm) / 304.8;
  return {
    widthFt, heightFt, resW: pxW * s.cols, resH: pxH * s.rows, cabinets: count,
    weightLb: count * cabinet.weightKg * 2.2046, powerW: count * cabinet.avgWatts, maxPowerW: count * cabinet.maxWatts,
    minViewFt: pitch * 3.28 * 1.5, pitch,
  };
}
/** 0 = seamless, 1 = good, 2 = visible pixels */
export function viewQuality(pitchMm: number, ft: number) { const ratio = ft / (pitchMm * 3.28); return ratio > 2.2 ? 0 : ratio > 1 ? 1 : 2; }
export const viewQualityLabels = ['Seamless', 'Good', 'Visible Pixels'];
