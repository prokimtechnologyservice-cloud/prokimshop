
DROP POLICY IF EXISTS "public can ack order items" ON public.order_items;
CREATE POLICY "public can ack order items"
  ON public.order_items FOR UPDATE
  USING (true) WITH CHECK (true);
GRANT UPDATE ON public.order_items TO anon;
