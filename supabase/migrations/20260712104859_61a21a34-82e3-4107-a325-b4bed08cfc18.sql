
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_fulfillment_status_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_fulfillment_status_check
  CHECK (fulfillment_status IN ('pending','acknowledged','finding','shipping','delivered'));

-- migrate existing acknowledged flag to new status
UPDATE public.order_items
  SET fulfillment_status = 'acknowledged'
  WHERE acknowledged = true AND fulfillment_status = 'pending';

-- backfill product_image from products.image_url for legacy rows
UPDATE public.order_items oi
  SET product_image = p.image_url
  FROM public.products p
  WHERE oi.product_id = p.id
    AND oi.product_image IS NULL
    AND p.image_url IS NOT NULL;
