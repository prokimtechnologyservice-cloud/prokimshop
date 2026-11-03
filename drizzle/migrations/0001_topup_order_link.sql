-- Link game top-up queue rows to the web order that created them, so staff
-- marking an order as paid also unlocks its Prokim City delivery queue.
ALTER TABLE public.topup_orders
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS topup_orders_order_id_idx ON public.topup_orders(order_id);