import { beforeEach, afterEach, expect, it, vi } from 'vitest';
beforeEach(() => { vi.resetModules(); localStorage.clear(); delete window.fbq; delete window._fbq; document.head.innerHTML=''; vi.stubGlobal('location', {hostname:'axisledwalls.com',pathname:'/start/'}); });
afterEach(() => vi.unstubAllGlobals());
it('does not load on admin pages', async () => {
 const m = await import('../lib/meta-pixel');
 vi.stubGlobal('location',{hostname:'axisledwalls.com',pathname:'/admin/'}); m.setMeasurementAllowed(true); expect(window.fbq).toBeUndefined();
});
it('queues one page view and one lead per submission, without form data', async () => {
 const m = await import('../lib/meta-pixel'); m.startPixel(); m.startPixel();
 m.trackSavedLead('submission-1'); m.trackSavedLead('submission-1');
 const events=window.fbq!.queue.filter(a=>a[0]==='trackSingle');
 expect(events).toEqual([['trackSingle',m.META_PIXEL_ID,'PageView'],['trackSingle',m.META_PIXEL_ID,'Lead',{}, {eventID:'submission-1'}]]);
 expect(document.querySelectorAll('script')).toHaveLength(1);
 m.setMeasurementAllowed(false);m.trackSavedLead('submission-2');expect(window.fbq!.queue.filter(a=>a[2]==='Lead')).toHaveLength(1);
});
it('respects Global Privacy Control', async()=>{
 vi.stubGlobal('navigator',{globalPrivacyControl:true}); const m=await import('../lib/meta-pixel');m.startPixel();m.setMeasurementAllowed(true);expect(window.fbq).toBeUndefined();
});

it('preserves a saved opt-out', async () => {
 localStorage.setItem('axis-ad-measurement', 'declined');
 const m = await import('../lib/meta-pixel'); m.startPixel(); m.trackSavedLead('blocked');
 expect(window.fbq).toBeUndefined(); expect(document.querySelectorAll('script')).toHaveLength(0);
});
it('honors session opt-outs even when storage fails', async () => {
 const m = await import('../lib/meta-pixel'); m.startPixel();
 vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
 m.setMeasurementAllowed(false); m.startPixel(); m.trackSavedLead('blocked');
 expect(window.fbq!.queue.filter(a => a[2] === 'Lead')).toHaveLength(0);
 expect(window.fbq!.queue.at(-1)).toEqual(['consent', 'revoke']);
 vi.restoreAllMocks();
});
it.each([['localhost', '/start/'], ['axisledwalls.com', '/'], ['axisledwalls.com', '/build/']])('does not initialize on %s%s', async (hostname, pathname) => {
 vi.stubGlobal('location', {hostname, pathname});
 const m = await import('../lib/meta-pixel'); m.startPixel(); expect(window.fbq).toBeUndefined();
});
