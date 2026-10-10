CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  church_name text NOT NULL CHECK (char_length(church_name) BETWEEN 1 AND 150),
  role text NOT NULL CHECK (role IN ('Pastor', 'Tech Director', 'Worship Leader', 'Other')),
  email text NOT NULL CHECK (char_length(email) <= 255),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  city text NOT NULL CHECK (char_length(city) BETWEEN 1 AND 100),
  state text NOT NULL CHECK (char_length(state) BETWEEN 2 AND 100),
  stage_width numeric CHECK (stage_width IS NULL OR stage_width BETWEEN 1 AND 1000),
  install_timeline text CHECK (install_timeline IS NULL OR install_timeline IN ('Before Christmas', 'Before Easter', 'This year', 'Just exploring')),
  message text CHECK (message IS NULL OR char_length(message) <= 3000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quote_requests TO anon, authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request a quote"
ON public.quote_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'new');