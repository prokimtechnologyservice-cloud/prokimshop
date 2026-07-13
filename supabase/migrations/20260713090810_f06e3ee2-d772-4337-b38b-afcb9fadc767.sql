
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS claim_instructions text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS image_url text;

UPDATE public.categories
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\u0E00-\u0E7F]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
WHERE slug IS NULL OR slug = '';

UPDATE public.categories c
SET slug = c.slug || '-' || substr(c.id::text, 1, 6)
WHERE (SELECT count(*) FROM public.categories c2 WHERE c2.slug = c.slug) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_uidx ON public.categories(slug);

ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS roblox_name text;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS roblox_name text,
  ADD COLUMN IF NOT EXISTS delivered_payload text;

CREATE TABLE IF NOT EXISTS public.product_account_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  payload text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  sold_to uuid,
  sold_at timestamptz,
  order_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_account_stock TO anon, authenticated;
GRANT ALL ON public.product_account_stock TO service_role;

ALTER TABLE public.product_account_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public all account stock" ON public.product_account_stock;
CREATE POLICY "public all account stock" ON public.product_account_stock
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS pas_product_status_idx ON public.product_account_stock(product_id, status);
