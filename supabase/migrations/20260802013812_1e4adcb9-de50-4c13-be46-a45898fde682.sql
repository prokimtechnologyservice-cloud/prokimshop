ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS auction_start_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auction_step numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auction_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS auction_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS auction_winner_id uuid,
  ADD COLUMN IF NOT EXISTS auction_final_price numeric;

CREATE TABLE IF NOT EXISTS public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  roblox_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_bids TO authenticated;
GRANT SELECT, INSERT ON public.auction_bids TO anon;
GRANT ALL ON public.auction_bids TO service_role;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read auction_bids" ON public.auction_bids FOR SELECT USING (true);
CREATE POLICY "public insert auction_bids" ON public.auction_bids FOR INSERT WITH CHECK (true);
CREATE POLICY "public write auction_bids" ON public.auction_bids FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS auction_bids_product_amount_idx ON public.auction_bids(product_id, amount DESC);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_token text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_token_uidx ON public.orders(client_token) WHERE client_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refund_to_user(_user_id uuid, _amount numeric, _note text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_balance numeric;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  UPDATE public.profiles SET balance = balance + _amount, updated_at = now()
    WHERE id = _user_id RETURNING balance INTO new_balance;
  IF new_balance IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  INSERT INTO public.wallet_transactions(user_id, type, amount, note)
    VALUES (_user_id, 'refund', _amount, _note);
  RETURN new_balance;
END;
$$;