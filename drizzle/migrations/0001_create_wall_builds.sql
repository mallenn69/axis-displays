CREATE TABLE public.wall_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selections JSONB NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.wall_builds TO anon, authenticated;
GRANT ALL ON public.wall_builds TO service_role;
ALTER TABLE public.wall_builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can save a wall build" ON public.wall_builds FOR INSERT TO anon, authenticated WITH CHECK (octet_length(selections::text) < 8000 AND octet_length(summary::text) < 4000);
ALTER TABLE public.quote_requests ADD COLUMN build_id UUID REFERENCES public.wall_builds(id) ON DELETE SET NULL;