import { countPanels, type StudioDesign } from '@/config/studio';
export type BuilderContact = { name: string; email: string; phone: string; location: string; church: string; notes: string };
export function builderInquiry(design: StudioDesign, contact: BuilderContact, id: string) {
  const sections = design.sections.map(s => `${s.name} (${s.kind}): ${s.cols} × ${s.rows} panels; ${s.cols * .5} × ${s.rows * .5} m; position ${s.x}, ${s.y}, ${s.z} m; tilt ${s.tilt}°, turn ${s.turn}°.`);
  const description = ['WALL BUILDER QUOTE REQUEST', `${countPanels(design)} total panels across ${design.sections.length} sections.`, ...sections, 'Graphics shown in the builder are visualization only, not a content requirement.', contact.notes.trim() && `Customer notes: ${contact.notes.trim()}`].filter(Boolean).join('\n');
  if (description.length > 3000) throw new Error('Please shorten your project notes.');
  const data = new FormData();
  for (const [key, value] of Object.entries({ submission_id: id, name: contact.name.trim(), email: contact.email.trim(), phone: contact.phone.trim(), state: contact.location.trim(), church_name: contact.church.trim(), description })) data.set(key, value);
  return data;
}
export async function sendBuilderInquiry(endpoint: string, data: FormData) {
  const response = await fetch(endpoint, { method: 'POST', body: data, signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok || result.success !== true) throw new Error(response.status === 429 ? 'Too many attempts. Please try again later.' : 'Your request wasn’t sent. Your details are still here—please try again.');
}
