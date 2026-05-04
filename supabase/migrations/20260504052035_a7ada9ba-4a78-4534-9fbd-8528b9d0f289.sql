CREATE TABLE public.site_overlays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL DEFAULT 'home',
  label text,
  kind text NOT NULL DEFAULT 'text',
  content text,
  image_url text,
  href text,
  x numeric NOT NULL DEFAULT 20,
  y numeric NOT NULL DEFAULT 20,
  w numeric NOT NULL DEFAULT 200,
  h numeric NOT NULL DEFAULT 60,
  rotate numeric NOT NULL DEFAULT 0,
  font_size numeric NOT NULL DEFAULT 16,
  color text,
  bg text,
  z_index integer NOT NULL DEFAULT 10,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_overlays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read site_overlays" ON public.site_overlays FOR SELECT USING (true);
CREATE POLICY "public write site_overlays" ON public.site_overlays FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_site_overlays_page ON public.site_overlays(page);