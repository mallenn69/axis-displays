import { beforeEach, afterEach, expect, it, vi } from 'vitest';
beforeEach(() => { vi.resetModules(); localStorage.clear(); delete window.fbq; delete window._fbq; document.head.innerHTML=''; vi.stubGlobal('location', {hostname:'axisledwalls.com',pathname:'/start/'}); });
afterEach(() => vi.unstubAllGlobals());
it('does not load Meta without permission or on admin pages', async () => {
 const m = await import('../lib/meta-pixel'); m.startPixel(); expect(window.fbq).toBeUndefined();
 vi.stubGlobal('location',{hostname:'axisledwalls.com',pathname:'/admin/'}); m.setMeasurementAllowed(true); expect(window.fbq).toBeUndefined();
});
it('queues one page view and one lead per submission, without form data', async () => {
 const m = await import('../lib/meta-pixel'); m.setMeasurementAllowed(true); m.startPixel();
 m.trackSavedLead('submission-1'); m.trackSavedLead('submission-1');
 const events=window.fbq!.queue.filter(a=>a[0]==='trackSingle');
 expect(events).toEqual([['trackSingle',m.META_PIXEL_ID,'PageView'],['trackSingle',m.META_PIXEL_ID,'Lead',{}, {eventID:'submission-1'}]]);
 expect(document.querySelectorAll('script')).toHaveLength(1);
 m.setMeasurementAllowed(false);m.trackSavedLead('submission-2');expect(window.fbq!.queue.filter(a=>a[2]==='Lead')).toHaveLength(1);
});
it('respects Global Privacy Control', async()=>{
 vi.stubGlobal('navigator',{globalPrivacyControl:true}); const m=await import('../lib/meta-pixel');m.setMeasurementAllowed(true);expect(window.fbq).toBeUndefined();
});
