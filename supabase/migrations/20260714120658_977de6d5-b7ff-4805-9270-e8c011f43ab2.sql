
-- ===== Mystery box (กล่องสุ่ม) =====
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS box_spin_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS box_border_color text,
  ADD COLUMN IF NOT EXISTS box_bg_color text;

CREATE TABLE IF NOT EXISTS public.mystery_box_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  prize_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  weight integer NOT NULL DEFAULT 1,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mystery_box_items_box_idx ON public.mystery_box_items(box_product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mystery_box_items TO anon, authenticated;
GRANT ALL ON public.mystery_box_items TO service_role;
ALTER TABLE public.mystery_box_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all mystery_box_items" ON public.mystery_box_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.mystery_box_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  box_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  prize_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  spin_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mystery_box_spins TO anon, authenticated;
GRANT ALL ON public.mystery_box_spins TO service_role;
ALTER TABLE public.mystery_box_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all mystery_box_spins" ON public.mystery_box_spins
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS mystery_box_id uuid,
  ADD COLUMN IF NOT EXISTS mystery_box_name text;

-- ===== Chat =====
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_user_read_at timestamptz NOT NULL DEFAULT now(),
  last_admin_read_at timestamptz NOT NULL DEFAULT 'epoch'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO anon, authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all chat_threads" ON public.chat_threads FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);
GRANT SELECT, INSERT ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
