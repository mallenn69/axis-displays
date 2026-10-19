// Public dataset identifier; never send form fields to Meta.
export const META_PIXEL_ID = '1135493235533163';
const consentKey = 'axis-ad-measurement';
type Pixel = ((...args: unknown[]) => void) & { queue: unknown[][]; callMethod?: (...args: unknown[]) => void; push?: Pixel; loaded: boolean; version: string };
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel } }
let sessionChoice: boolean | undefined;
let initialized = false;
let pageViewed = false;
const sent = new Set<string>();
export function measurementAllowed() {
 if (typeof window === 'undefined' || (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl) return false;
 if (sessionChoice !== undefined) return sessionChoice;
 try { const choice = localStorage.getItem(consentKey); return choice === null || choice === 'allowed'; } catch { return false; }
}
export function setMeasurementAllowed(allowed: boolean) {
 sessionChoice = allowed;
 try { localStorage.setItem(consentKey, allowed ? 'allowed' : 'declined'); } catch { /* session-only choice */ }
 if (!allowed) { window.fbq?.('consent', 'revoke'); return; }
 startPixel();
}
export function startPixel() {
 if (!measurementAllowed()) return;
 // Keep the pixel off previews, admin pages and every other route.
 if (location.hostname !== 'axisledwalls.com' || !/^\/(start|compare|build|churches(?:\/quiz)?)\/?$/.test(location.pathname)) return;
 if (!window.fbq) {
  const pixel = function (...args: unknown[]) { pixel.callMethod ? pixel.callMethod(...args) : pixel.queue.push(args); } as Pixel;
  pixel.queue = []; pixel.push = pixel; pixel.loaded = true; pixel.version = '2.0';
  window.fbq = pixel; window._fbq = pixel;
  const script = document.createElement('script'); script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
 }
 window.fbq('consent', 'grant');
 if (!initialized) {
  window.fbq('set', 'autoConfig', false, META_PIXEL_ID);
  window.fbq('init', META_PIXEL_ID);
  initialized = true;
 }
 if (!pageViewed) { window.fbq('trackSingle', META_PIXEL_ID, 'PageView'); pageViewed = true; }
}
export function trackSavedLead(id: string) {
 try {
  if (!measurementAllowed() || !initialized || sent.has(id)) return;
  window.fbq?.('trackSingle', META_PIXEL_ID, 'Lead', {}, { eventID: id });
  sent.add(id);
 } catch { /* Tracking must never interrupt the form. */ }
}
