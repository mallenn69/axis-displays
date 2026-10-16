import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LeadPage } from '../components/leads/lead-page';
import { startPixel, trackSavedLead } from '../lib/meta-pixel';
vi.mock('../lib/meta-pixel', () => ({ startPixel: vi.fn(), trackSavedLead: vi.fn() }));
vi.mock('../lib/traffic', () => ({ trackTraffic: vi.fn(), trafficAllowed: () => false, trafficChoice: () => null, setTrafficChoice: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_LEADS_ENDPOINT', 'https://example.test/leads'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function form() {
 const result = render(<StrictMode><LeadPage /></StrictMode>);
 fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test Person' } });
 fireEvent.change(screen.getByLabelText('Brief description'), { target: { value: 'Private project details' } });
 fireEvent.change(screen.getByLabelText(/Sanctuary photo/), { target: { files: [new File(['photo'], 'private.png', { type: 'image/png' })] } });
 return result.container.querySelector('form')!;
}
it('starts the pixel on mount with no advertising consent UI', () => {
 render(<LeadPage />);
 expect(startPixel).toHaveBeenCalledOnce();
 expect(screen.queryByLabelText('Advertising privacy')).toBeNull();
 expect(screen.queryByText('Ad privacy settings')).toBeNull();
 expect(trackSavedLead).not.toHaveBeenCalled();
});
it('only tracks after confirmed success and passes only the submission ID', async () => {
 let finish!: (value: unknown) => void;
 vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve; })));
 fireEvent.submit(form());
 expect(trackSavedLead).not.toHaveBeenCalled();
 finish({ ok: true, json: async () => ({ success: true }) });
 await screen.findByRole('status');
 expect(trackSavedLead).toHaveBeenCalledTimes(1);
 const body = vi.mocked(fetch).mock.calls[0][1]!.body as FormData;
 expect(trackSavedLead).toHaveBeenCalledWith(body.get('submission_id'));
 expect(vi.mocked(trackSavedLead).mock.calls[0]).toHaveLength(1);
});
it.each(['http', 'rejected', 'network', 'json'])('does not track a %s failure', async kind => {
 vi.stubGlobal('fetch', vi.fn(async () => {
  if (kind === 'network') throw new Error('offline');
  return { ok: kind !== 'http', json: async () => {
   if (kind === 'json') throw new Error('invalid JSON');
   return { success: kind !== 'rejected' };
  } };
 }));
 fireEvent.submit(form());
 await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
 expect(trackSavedLead).not.toHaveBeenCalled();
});

it('can hide the separate analytics preferences on the start page', async () => {
 const { TrafficChoice } = await import('../components/leads/traffic-choice');
 const { container } = render(<TrafficChoice showPreferences={false} />);
 expect(container.innerHTML).toBe('');
});

it('saves the educational inquiry with church and project details and tracks confirmed success', async () => {
 vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })));
 const { container } = render(<LeadPage educational />);
 fireEvent.change(screen.getByLabelText('Church name'), { target: { value: 'Example Church' } });
 fireEvent.change(screen.getByLabelText('Tell us a bit about your space or project'), { target: { value: 'Replace our projector on a 30-foot stage.' } });
 expect(container.querySelector('input[type="file"]')).toBeNull();
 fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Example Person' } });
 fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '2025550100' } });
 fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'example@example.com' } });
 fireEvent.change(screen.getByLabelText('Location (state)'), { target: { value: 'Arizona' } });
 fireEvent.submit(container.querySelector('form')!);
 await screen.findByRole('status');
 const body = vi.mocked(fetch).mock.calls[0][1]!.body as FormData;
 expect(body.get('state')).toBe('Arizona');
 expect(body.get('church_name')).toBe('Example Church');
 expect(body.get('description')).toBe('Replace our projector on a 30-foot stage.');
 expect(body.has('photo')).toBe(false);
 expect(trackSavedLead).toHaveBeenCalledWith(body.get('submission_id'));
});
