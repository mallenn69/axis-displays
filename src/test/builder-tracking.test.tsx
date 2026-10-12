import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QuoteDialog } from '../components/builder/studio-quote';
import { defaultDesign } from '../config/studio';
import { sendBuilderInquiry } from '../lib/builder-inquiry';
import { trackSavedLead } from '../lib/meta-pixel';
vi.mock('../lib/meta-pixel', () => ({ trackSavedLead: vi.fn() }));
vi.mock('../lib/traffic', () => ({ trackTraffic: vi.fn() }));
vi.mock('../lib/builder-inquiry', async importOriginal => ({ ...await importOriginal<typeof import('../lib/builder-inquiry')>(), sendBuilderInquiry: vi.fn() }));
beforeEach(() => {
 vi.clearAllMocks();vi.stubEnv('VITE_LEADS_ENDPOINT','https://example.test/leads');
 HTMLDialogElement.prototype.showModal=vi.fn();
});
afterEach(() => { cleanup();vi.unstubAllEnvs(); });
it('tracks only confirmed builder submission and sends only the event ID', async () => {
 let finish!: () => void;
 vi.mocked(sendBuilderInquiry).mockImplementation(() => new Promise<void>(resolve => { finish=resolve; }));
 const {container}=render(<QuoteDialog design={defaultDesign} onClose={()=>{}} />);
 fireEvent.submit(container.querySelector('form')!);
 expect(trackSavedLead).not.toHaveBeenCalled();
 finish();
 await waitFor(()=>expect(trackSavedLead).toHaveBeenCalledOnce());
 const data=vi.mocked(sendBuilderInquiry).mock.calls[0][1];
 expect(trackSavedLead).toHaveBeenCalledWith(data.get('submission_id'));
 expect(vi.mocked(trackSavedLead).mock.calls[0]).toHaveLength(1);
});
it('does not track failed builder submission', async () => {
 vi.mocked(sendBuilderInquiry).mockRejectedValue(new Error('Failed'));
 const {container}=render(<QuoteDialog design={defaultDesign} onClose={()=>{}} />);
 fireEvent.submit(container.querySelector('form')!);
 await waitFor(()=>expect(container.textContent).toContain('Failed'));
 expect(trackSavedLead).not.toHaveBeenCalled();
});
