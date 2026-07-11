
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS paid_from_balance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  note text,
  voucher_code text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO anon, authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public all wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "public all wallet_transactions" ON public.wallet_transactions FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.topup_balance(_user_id uuid, _amount numeric, _voucher text, _ip text)
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
  INSERT INTO public.wallet_transactions(user_id, type, amount, note, voucher_code, ip_address)
    VALUES (_user_id, 'topup', _amount, 'TrueMoney voucher', _voucher, _ip);
  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_balance(_user_id uuid, _amount numeric, _order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cur numeric; new_balance numeric;
BEGIN
  SELECT balance INTO cur FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF cur < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.profiles SET balance = balance - _amount, updated_at = now()
    WHERE id = _user_id RETURNING balance INTO new_balance;
  INSERT INTO public.wallet_transactions(user_id, type, amount, note)
    VALUES (_user_id, 'purchase', -_amount, 'order:' || _order_id::text);
  RETURN new_balance;
END;
$$;
