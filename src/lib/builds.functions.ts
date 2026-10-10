import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { selectionsSchema, computeSummary } from '@/config/builder';
import { quoteSchema } from '@/config/quote';

function publicClient() {
  return import('@supabase/supabase-js').then(({ createClient }) => {
    const url = process.env['SUPABASE_URL']; const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error('Service unavailable.');
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_')) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
  });
}

/** Saves the build, then the quote request linked to it. Summary is recomputed on the server. */
export const submitBuildQuote = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ selections: selectionsSchema, quote: quoteSchema }).parse(input))
  .handler(async ({ data }) => {
    const client = await publicClient();
    const id = crypto.randomUUID();
    const summary = computeSummary(data.selections);
    const { error: e1 } = await client.from('wall_builds').insert({ id, selections: data.selections, summary });
    if (e1) throw new Error('We couldn’t save your build. Please try again.');
    const { website, ...q } = data.quote;
    const { error } = await client.from('quote_requests').insert({ ...q, build_id: id, phone: q.phone || null, message: q.message || null, install_timeline: q.install_timeline || null });
    if (error) throw new Error('We couldn’t send your request. Please try again.');
    return { success: true };
  });
