-- ============ 1) Fully private tables: no browser access at all ============
DROP POLICY IF EXISTS "public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "public update profiles" ON public.profiles;
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "public read staff" ON public.staff;
DROP POLICY IF EXISTS "public insert staff" ON public.staff;
DROP POLICY IF EXISTS "public update staff" ON public.staff;
DROP POLICY IF EXISTS "public delete staff" ON public.staff;
REVOKE ALL ON public.staff FROM anon, authenticated;
GRANT ALL ON public.staff TO service_role;

DROP POLICY IF EXISTS "public all cart" ON public.cart_items;
REVOKE ALL ON public.cart_items FROM anon, authenticated;
GRANT ALL ON public.cart_items TO service_role;

DROP POLICY IF EXISTS "public all orders" ON public.orders;
REVOKE ALL ON public.orders FROM anon, authenticated;
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS "public all order_items" ON public.order_items;
DROP POLICY IF EXISTS "public can ack order items" ON public.order_items;
DROP POLICY IF EXISTS "users read own order items" ON public.order_items;
REVOKE ALL ON public.order_items FROM anon, authenticated;
GRANT ALL ON public.order_items TO service_role;

DROP POLICY IF EXISTS "public all wallet_transactions" ON public.wallet_transactions;
REVOKE ALL ON public.wallet_transactions FROM anon, authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

DROP POLICY IF EXISTS "public read user_promotions" ON public.user_promotions;
DROP POLICY IF EXISTS "public write user_promotions" ON public.user_promotions;
REVOKE ALL ON public.user_promotions FROM anon, authenticated;
GRANT ALL ON public.user_promotions TO service_role;

DROP POLICY IF EXISTS "public all mystery_box_spins" ON public.mystery_box_spins;
REVOKE ALL ON public.mystery_box_spins FROM anon, authenticated;
GRANT ALL ON public.mystery_box_spins TO service_role;

DROP POLICY IF EXISTS "public all chat_threads" ON public.chat_threads;
REVOKE ALL ON public.chat_threads FROM anon, authenticated;
GRANT ALL ON public.chat_threads TO service_role;

DROP POLICY IF EXISTS "public all chat_messages" ON public.chat_messages;
REVOKE ALL ON public.chat_messages FROM anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;

DROP POLICY IF EXISTS "public read gift_cards" ON public.gift_cards;
DROP POLICY IF EXISTS "public write gift_cards" ON public.gift_cards;
REVOKE ALL ON public.gift_cards FROM anon, authenticated;
GRANT ALL ON public.gift_cards TO service_role;

DROP POLICY IF EXISTS "public all account stock" ON public.product_account_stock;
REVOKE ALL ON public.product_account_stock FROM anon, authenticated;
GRANT ALL ON public.product_account_stock TO service_role;

-- ============ 2) Public catalog: read stays, writes move to the server ============
DROP POLICY IF EXISTS "public write categories" ON public.categories;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.categories FROM anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;

DROP POLICY IF EXISTS "public write products" ON public.products;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.products FROM anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

DROP POLICY IF EXISTS "public write site_settings" ON public.site_settings;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.site_settings FROM anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

DROP POLICY IF EXISTS "reviews insertable" ON public.product_reviews;
DROP POLICY IF EXISTS "reviews updatable" ON public.product_reviews;
DROP POLICY IF EXISTS "reviews deletable" ON public.product_reviews;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.product_reviews FROM anon, authenticated;
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT ALL ON public.product_reviews TO service_role;

DROP POLICY IF EXISTS "public insert auction_bids" ON public.auction_bids;
DROP POLICY IF EXISTS "public write auction_bids" ON public.auction_bids;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.auction_bids FROM anon, authenticated;
GRANT SELECT ON public.auction_bids TO anon, authenticated;
GRANT ALL ON public.auction_bids TO service_role;

-- ============ 3) Image storage: read stays public, writes server-only ============
DROP POLICY IF EXISTS "public upload product images" ON storage.objects;
DROP POLICY IF EXISTS "public update product images" ON storage.objects;
DROP POLICY IF EXISTS "public delete product images" ON storage.objects;

-- ============ 4) Privileged functions callable only from the server ============
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_sold_count(uuid, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.deduct_balance(uuid, numeric, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.purge_old_stats() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.redeem_gift_card(text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.refund_to_user(uuid, numeric, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.topup_balance(uuid, numeric, text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_sold_count(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_balance(uuid, numeric, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_old_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_to_user(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.topup_balance(uuid, numeric, text, text) TO service_role;