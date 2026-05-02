ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_receipt_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..14 LOOP
    result := result || substr(chars, (floor(random() * length(chars))::int) + 1, 1);
  END LOOP;
  RETURN 'IP:' || result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_receipt_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.receipt_code IS NULL THEN
    LOOP
      NEW.receipt_code := public.generate_receipt_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE receipt_code = NEW.receipt_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_receipt_code ON public.orders;
CREATE TRIGGER trg_set_order_receipt_code
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_receipt_code();

UPDATE public.orders SET receipt_code = public.generate_receipt_code() WHERE receipt_code IS NULL;