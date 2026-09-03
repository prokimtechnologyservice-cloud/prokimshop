ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS farm_account_name text,
  ADD COLUMN IF NOT EXISTS farm_account_password text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS farm_account_name text,
  ADD COLUMN IF NOT EXISTS farm_account_password text;