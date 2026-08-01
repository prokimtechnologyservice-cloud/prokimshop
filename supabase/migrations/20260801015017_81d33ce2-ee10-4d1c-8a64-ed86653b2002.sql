ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_note text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS product_sort_mode text NOT NULL DEFAULT 'manual';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS return_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

CREATE OR REPLACE FUNCTION public.adjust_product_stock(_product_id uuid, _delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cur integer; nv integer;
BEGIN
  SELECT stock INTO cur FROM public.products WHERE id = _product_id FOR UPDATE;
  IF cur IS NULL THEN RETURN NULL; END IF;
  nv := GREATEST(0, cur + _delta);
  UPDATE public.products SET stock = nv WHERE id = _product_id;
  RETURN nv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer) TO anon, authenticated, service_role;