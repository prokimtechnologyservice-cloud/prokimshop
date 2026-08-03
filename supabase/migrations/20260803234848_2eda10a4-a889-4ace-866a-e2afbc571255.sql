-- ============ PROMOTIONS / DISCOUNTS ============
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'discount',            -- 'discount' | 'promotion'
  name text NOT NULL,
  code text,
  image_url text,
  description text,
  discount_type text NOT NULL DEFAULT 'amount',     -- amount | percent | bogo
  discount_value numeric NOT NULL DEFAULT 0,
  buy_qty integer NOT NULL DEFAULT 0,
  get_qty integer NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'all',           -- all | products | categories
  product_ids uuid[] NOT NULL DEFAULT '{}',
  category_ids uuid[] NOT NULL DEFAULT '{}',
  min_subtotal numeric NOT NULL DEFAULT 0,
  max_subtotal numeric,
  apply_on text NOT NULL DEFAULT 'receipt',         -- receipt | items
  valid_days integer NOT NULL DEFAULT 30,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  grant_rule text NOT NULL DEFAULT 'manual',        -- manual | all | new_user | topup_over | spend_over | order_count
  grant_value numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO anon;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read promotions" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "public write promotions" ON public.promotions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.user_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz,
  used_at timestamptz,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_promotions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_promotions TO anon;
GRANT ALL ON public.user_promotions TO service_role;
ALTER TABLE public.user_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read user_promotions" ON public.user_promotions FOR SELECT USING (true);
CREATE POLICY "public write user_promotions" ON public.user_promotions FOR ALL USING (true) WITH CHECK (true);

-- ============ GIFT CARDS ============
CREATE TABLE public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  image_url text,
  description text,
  reward_balance numeric NOT NULL DEFAULT 0,
  reward_product_ids uuid[] NOT NULL DEFAULT '{}',
  reward_promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO anon;
GRANT ALL ON public.gift_cards TO service_role;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read gift_cards" ON public.gift_cards FOR SELECT USING (true);
CREATE POLICY "public write gift_cards" ON public.gift_cards FOR ALL USING (true) WITH CHECK (true);

-- ============ POPUPS ============
CREATE TABLE public.site_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  body text,
  image_url text,
  href text,
  promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_popups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_popups TO anon;
GRANT ALL ON public.site_popups TO service_role;
ALTER TABLE public.site_popups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read site_popups" ON public.site_popups FOR SELECT USING (true);
CREATE POLICY "public write site_popups" ON public.site_popups FOR ALL USING (true) WITH CHECK (true);

-- ============ ANNOUNCEMENTS ============
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url text;

-- ============ CHAT ============
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_broadcast boolean NOT NULL DEFAULT false;

-- ============ MYSTERY BOX ============
ALTER TABLE public.mystery_box_items
  ADD COLUMN IF NOT EXISTS chance numeric,
  ADD COLUMN IF NOT EXISTS is_nothing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.mystery_box_items ALTER COLUMN prize_product_id DROP NOT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS mystery_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS box_stock integer,
  ADD COLUMN IF NOT EXISTS box_template text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS box_mode text NOT NULL DEFAULT 'slide',
  ADD COLUMN IF NOT EXISTS box_bg_image text,
  ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0;

-- ============ CATEGORIES ============
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS block_color text,
  ADD COLUMN IF NOT EXISTS button_color text,
  ADD COLUMN IF NOT EXISTS banner_url text;

-- ============ SITE SETTINGS (stats overrides) ============
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS stats_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS stats_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stat_online integer,
  ADD COLUMN IF NOT EXISTS stat_users integer,
  ADD COLUMN IF NOT EXISTS stat_topup numeric,
  ADD COLUMN IF NOT EXISTS stat_sold integer;

-- ============ GIFT CARD REDEEM RPC ============
CREATE OR REPLACE FUNCTION public.redeem_gift_card(_code text, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE gc public.gift_cards; nb numeric;
BEGIN
  SELECT * INTO gc FROM public.gift_cards WHERE code = upper(_code) FOR UPDATE;
  IF gc.id IS NULL THEN RAISE EXCEPTION 'ไม่พบรหัสบัตรนี้'; END IF;
  IF NOT gc.active THEN RAISE EXCEPTION 'บัตรนี้ถูกปิดใช้งาน'; END IF;
  IF gc.used_at IS NOT NULL THEN RAISE EXCEPTION 'บัตรนี้ถูกใช้ไปแล้ว'; END IF;

  UPDATE public.gift_cards SET used_by = _user_id, used_at = now() WHERE id = gc.id;

  IF gc.reward_balance > 0 THEN
    UPDATE public.profiles SET balance = balance + gc.reward_balance, updated_at = now()
      WHERE id = _user_id RETURNING balance INTO nb;
    INSERT INTO public.wallet_transactions(user_id, type, amount, note)
      VALUES (_user_id, 'topup', gc.reward_balance, 'Gift card ' || gc.code);
  END IF;

  IF gc.reward_promotion_id IS NOT NULL THEN
    INSERT INTO public.user_promotions(promotion_id, user_id, expires_at)
      SELECT gc.reward_promotion_id, _user_id, now() + (COALESCE(p.valid_days, 30) || ' days')::interval
      FROM public.promotions p WHERE p.id = gc.reward_promotion_id
      ON CONFLICT (promotion_id, user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'label', gc.label,
    'image_url', gc.image_url,
    'description', gc.description,
    'balance', gc.reward_balance,
    'new_balance', nb,
    'promotion_id', gc.reward_promotion_id,
    'product_ids', gc.reward_product_ids
  );
END;
$$;

-- ============ SOLD COUNT / STOCK TRIGGER SUPPORT ============
CREATE OR REPLACE FUNCTION public.bump_sold_count(_product_id uuid, _delta integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.products SET sold_count = GREATEST(0, sold_count + _delta) WHERE id = _product_id;
$$;