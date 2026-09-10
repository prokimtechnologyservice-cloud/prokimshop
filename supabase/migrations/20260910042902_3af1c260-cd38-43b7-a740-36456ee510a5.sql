CREATE OR REPLACE FUNCTION public.generate_receipt_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_order_receipt_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.receipt_code IS NULL THEN
    LOOP
      NEW.receipt_code := public.generate_receipt_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE receipt_code = NEW.receipt_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;