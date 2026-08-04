-- 1. product reviews
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO anon, authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews readable" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "reviews insertable" ON public.product_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews updatable" ON public.product_reviews FOR UPDATE USING (true);
CREATE POLICY "reviews deletable" ON public.product_reviews FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'rating must be 1-5'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_review_rating BEFORE INSERT OR UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

-- 2. countdown widgets
CREATE TABLE public.countdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text,
  ends_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countdowns TO anon, authenticated;
GRANT ALL ON public.countdowns TO service_role;
ALTER TABLE public.countdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countdowns readable" ON public.countdowns FOR SELECT USING (true);
CREATE POLICY "countdowns writable" ON public.countdowns FOR ALL USING (true) WITH CHECK (true);

-- 3. promotions extras
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS link_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_token text,
  ADD COLUMN IF NOT EXISTS require_distinct_products integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apply_after_discounts boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS promotions_link_token_key ON public.promotions(link_token) WHERE link_token IS NOT NULL;

-- 4. 5-year stats retention
CREATE OR REPLACE FUNCTION public.purge_old_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.visits WHERE visited_at < now() - interval '5 years';
  DELETE FROM public.category_views WHERE created_at < now() - interval '5 years';
  DELETE FROM public.wallet_transactions WHERE created_at < now() - interval '5 years';
END; $$;