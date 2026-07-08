
-- 1) categories: parent_id + search_keywords
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS search_keywords text[] NOT NULL DEFAULT '{}';

-- 2) products: stock + search_keywords + view_count
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock integer,
  ADD COLUMN IF NOT EXISTS search_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- 3) order_items: product_id (nullable, for sales tracking)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- 4) category_views table
CREATE TABLE IF NOT EXISTS public.category_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  session_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.category_views TO anon, authenticated;
GRANT ALL ON public.category_views TO service_role;
ALTER TABLE public.category_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cv_insert" ON public.category_views;
DROP POLICY IF EXISTS "cv_select" ON public.category_views;
CREATE POLICY "cv_insert" ON public.category_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cv_select" ON public.category_views FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS category_views_cat_time_idx ON public.category_views (category_id, created_at DESC);

-- 5) Merge BloxFruit categories
DO $$
DECLARE
  parent_id_v uuid := '22222222-2222-2222-2222-222222222222'; -- was "Blox Fruits"
  gamepass_old uuid := '33333333-3333-3333-3333-333333333333'; -- was "Gamepasses BloxFruits"
  fruit_child uuid;
  gp_child uuid;
BEGIN
  -- Rename parent
  UPDATE public.categories SET name = 'BloxFruit' WHERE id = parent_id_v;

  -- Create Fruit child (if not exists)
  SELECT id INTO fruit_child FROM public.categories WHERE parent_id = parent_id_v AND name = 'Fruit' LIMIT 1;
  IF fruit_child IS NULL THEN
    INSERT INTO public.categories (name, sort_order, parent_id)
    VALUES ('Fruit', 10, parent_id_v)
    RETURNING id INTO fruit_child;
  END IF;

  -- Create Gamepass child
  SELECT id INTO gp_child FROM public.categories WHERE parent_id = parent_id_v AND name = 'Gamepass' LIMIT 1;
  IF gp_child IS NULL THEN
    INSERT INTO public.categories (name, sort_order, parent_id)
    VALUES ('Gamepass', 20, parent_id_v)
    RETURNING id INTO gp_child;
  END IF;

  -- Move products
  UPDATE public.products
    SET category_id = fruit_child
    WHERE category_id = parent_id_v;

  UPDATE public.products
    SET category_id = gp_child
    WHERE category_id = gamepass_old;

  -- Delete old gamepass category
  DELETE FROM public.categories WHERE id = gamepass_old;
END $$;
