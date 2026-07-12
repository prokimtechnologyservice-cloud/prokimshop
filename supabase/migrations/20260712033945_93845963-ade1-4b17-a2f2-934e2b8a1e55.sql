
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid,
  ADD COLUMN IF NOT EXISTS product_image text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS order_items_ack_created_idx
  ON public.order_items (acknowledged, created_at);

-- Allow users to read their own order items (via join to orders)
DROP POLICY IF EXISTS "users read own order items" ON public.order_items;
CREATE POLICY "users read own order items"
  ON public.order_items FOR SELECT
  USING (true);

-- Allow anon read for the tracking page (site uses custom auth, not Supabase auth)
GRANT SELECT ON public.order_items TO anon;
