-- Provision membership with a trusted database administrator, never from the browser.
CREATE TABLE public.staff_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'sales', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_members FROM anon, authenticated;
GRANT SELECT ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
CREATE POLICY "Staff can read own membership" ON public.staff_members FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

CREATE FUNCTION public.axis_staff_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role FROM public.staff_members WHERE user_id = (select auth.uid()) $$;
REVOKE ALL ON FUNCTION public.axis_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.axis_staff_role() TO authenticated;

GRANT SELECT ON public.quote_requests, public.wall_builds TO authenticated;
REVOKE UPDATE ON public.quote_requests FROM authenticated;
GRANT UPDATE (status) ON public.quote_requests TO authenticated;
CREATE POLICY "Staff read leads" ON public.quote_requests FOR SELECT TO authenticated USING ((select public.axis_staff_role()) IS NOT NULL);
CREATE POLICY "Sales update lead status" ON public.quote_requests FOR UPDATE TO authenticated
USING ((select public.axis_staff_role()) IN ('owner','admin','sales')) WITH CHECK ((select public.axis_staff_role()) IN ('owner','admin','sales'));
CREATE POLICY "Staff read builds" ON public.wall_builds FOR SELECT TO authenticated USING ((select public.axis_staff_role()) IS NOT NULL);

CREATE FUNCTION public.axis_valid_lines(lines jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE item jsonb;
BEGIN
  IF jsonb_typeof(lines) <> 'array' OR jsonb_array_length(lines) NOT BETWEEN 1 AND 50 THEN RETURN false; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(lines) LOOP
    IF jsonb_typeof(item) <> 'object'
      OR coalesce(jsonb_typeof(item->'description'), '') <> 'string'
      OR length(trim(item->>'description')) NOT BETWEEN 1 AND 250
      OR coalesce(jsonb_typeof(item->'quantity'), '') <> 'number'
      OR coalesce(jsonb_typeof(item->'unit_price_cents'), '') <> 'number'
      THEN RETURN false; END IF;
    IF (item->>'quantity')::numeric NOT BETWEEN 1 AND 10000
      OR (item->>'quantity')::numeric <> trunc((item->>'quantity')::numeric)
      OR (item->>'unit_price_cents')::numeric NOT BETWEEN 0 AND 100000000
      OR (item->>'unit_price_cents')::numeric <> trunc((item->>'unit_price_cents')::numeric)
      THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;
CREATE TABLE public.quote_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 150),
  customer_name text NOT NULL CHECK (length(trim(customer_name)) BETWEEN 1 AND 150),
  customer_email text NOT NULL DEFAULT '' CHECK (length(customer_email) <= 255),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 5000),
  line_items jsonb NOT NULL CHECK (public.axis_valid_lines(line_items)),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_drafts FROM anon, authenticated;
GRANT SELECT ON public.quote_drafts TO authenticated;
GRANT INSERT (quote_request_id,title,customer_name,customer_email,notes,line_items) ON public.quote_drafts TO authenticated;
GRANT UPDATE (quote_request_id,title,customer_name,customer_email,notes,line_items) ON public.quote_drafts TO authenticated;
GRANT ALL ON public.quote_drafts TO service_role;
CREATE POLICY "Staff read drafts" ON public.quote_drafts FOR SELECT TO authenticated USING ((select public.axis_staff_role()) IS NOT NULL);
CREATE POLICY "Sales create drafts" ON public.quote_drafts FOR INSERT TO authenticated WITH CHECK ((select public.axis_staff_role()) IN ('owner','admin','sales') AND created_by = (select auth.uid()));
CREATE POLICY "Sales edit drafts" ON public.quote_drafts FOR UPDATE TO authenticated USING ((select public.axis_staff_role()) IN ('owner','admin','sales')) WITH CHECK ((select public.axis_staff_role()) IN ('owner','admin','sales'));
CREATE FUNCTION public.axis_stamp_draft() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = clock_timestamp(); RETURN NEW; END $$;
CREATE TRIGGER stamp_draft BEFORE UPDATE ON public.quote_drafts FOR EACH ROW EXECUTE FUNCTION public.axis_stamp_draft();
CREATE INDEX quote_drafts_updated ON public.quote_drafts (updated_at DESC);
CREATE INDEX quote_requests_created ON public.quote_requests (created_at DESC);
