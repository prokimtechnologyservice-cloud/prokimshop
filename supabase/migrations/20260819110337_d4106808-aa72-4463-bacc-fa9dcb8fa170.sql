CREATE TABLE public.store_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  access_code text NOT NULL DEFAULT '0000',
  confirm_code text NOT NULL DEFAULT '1234',
  store_open boolean NOT NULL DEFAULT true,
  shift_label text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.store_settings (id) VALUES (true);

CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  customer_name text,
  note text,
  total numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  paid_by text,
  delivery_status text NOT NULL DEFAULT 'none',
  delivery_note text,
  delivered_at timestamptz,
  delivered_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.store_orders TO service_role;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id uuid,
  product_name text NOT NULL,
  image_url text,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.store_order_items TO service_role;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX store_orders_created_idx ON public.store_orders (created_at DESC);
CREATE INDEX store_order_items_order_idx ON public.store_order_items (order_id);