import { createServerFn } from '@tanstack/react-start';
import { quoteSchema } from '@/config/quote';
export const submitQuote = createServerFn({ method: 'POST' })
 .validator((input: unknown) => quoteSchema.parse(input))
 .handler(async ({ data }) => {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env['SUPABASE_URL']; const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Quote service unavailable.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_')) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
  const { website, ...request } = data;
  const { error } = await client.from('quote_requests').insert({ ...request, phone: request.phone || null, message: request.message || null, install_timeline: request.install_timeline || null });
  if (error) throw new Error('We couldn’t save your request. Please try again.');
  return { success: true };
 });
