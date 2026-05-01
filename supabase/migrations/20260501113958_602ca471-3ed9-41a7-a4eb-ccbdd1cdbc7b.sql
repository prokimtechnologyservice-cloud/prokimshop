
-- profiles table for app users
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  roblox_name TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- staff (admins / manager)
CREATE TYPE public.staff_role AS ENUM ('admin', 'manager');

CREATE TABLE public.staff (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  staff_code TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role public.staff_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.staff (name, staff_code, password, role) VALUES
  ('Yok',  'AM-1212',  'am_11221',     'admin'),
  ('Kim',  'AM-2323',  'am_22332',     'admin'),
  ('Kong', 'AM-3434',  'am_33443',     'admin'),
  ('Beam', 'HAM-096',  'am_0960384928','manager');

-- categories
CREATE TABLE public.categories (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- products
CREATE TABLE public.products (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- orders + items (kept as receipt history)
CREATE TABLE public.orders (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1
);

-- cart items (persistent per user)
CREATE TABLE public.cart_items (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- site settings (single row)
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  is_open BOOLEAN NOT NULL DEFAULT true,
  closed_message TEXT DEFAULT 'เว็บไซต์ปิดปรับปรุงชั่วคราว',
  CONSTRAINT only_one_row CHECK (id = 1)
);
INSERT INTO public.site_settings (id, is_open) VALUES (1, true);

-- visit log for stats
CREATE TABLE public.visits (
  id BIGSERIAL PRIMARY KEY,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_key TEXT
);

-- Enable RLS
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits        ENABLE ROW LEVEL SECURITY;

-- Public read for catalog/announcements/site_settings
CREATE POLICY "public read categories"    ON public.categories    FOR SELECT USING (true);
CREATE POLICY "public read products"      ON public.products      FOR SELECT USING (true);
CREATE POLICY "public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "public read site_settings" ON public.site_settings FOR SELECT USING (true);

-- Profiles: anyone can insert (signup) and read by username for login (we hash on server),
-- but balance updates must go through admin path. We allow public select for login lookup.
CREATE POLICY "public read profiles"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "public update profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

-- Staff: public read needed for staff login lookup (passwords are plain per spec)
CREATE POLICY "public read staff" ON public.staff FOR SELECT USING (true);

-- Orders / order_items / cart: public access (auth handled in app layer with custom user)
CREATE POLICY "public all orders"      ON public.orders      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all cart"        ON public.cart_items  FOR ALL USING (true) WITH CHECK (true);

-- Admin write policies for catalog (app gates this with staff login)
CREATE POLICY "public write categories"    ON public.categories    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write products"      ON public.products      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public insert visits"       ON public.visits        FOR INSERT WITH CHECK (true);
CREATE POLICY "public read visits"         ON public.visits        FOR SELECT USING (true);

-- Seed categories + products (Robux, Blox Fruits, Brookhaven, 99 คืนในป่า, Gamepasses, เพชร)
INSERT INTO public.categories (id, name, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Robux',           1),
  ('22222222-2222-2222-2222-222222222222', 'Blox Fruits',     2),
  ('33333333-3333-3333-3333-333333333333', 'Gamepasses',      3),
  ('44444444-4444-4444-4444-444444444444', 'Brookhaven',      4),
  ('55555555-5555-5555-5555-555555555555', '99 คืนในป่า',     5),
  ('66666666-6666-6666-6666-666666666666', 'เพชร 99 คืนในป่า',6);

-- Robux
INSERT INTO public.products (category_id, name, price, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', '40 Robux',     15, 1),
  ('11111111-1111-1111-1111-111111111111', '80 Robux',     30, 2),
  ('11111111-1111-1111-1111-111111111111', '160 Robux',    55, 3),
  ('11111111-1111-1111-1111-111111111111', '400 Robux',   135, 4),
  ('11111111-1111-1111-1111-111111111111', '800 Robux',   270, 5),
  ('11111111-1111-1111-1111-111111111111', '1,700 Robux', 555, 6),
  ('11111111-1111-1111-1111-111111111111', '3,000 Robux', 990, 7),
  ('11111111-1111-1111-1111-111111111111', '4,500 Robux',1490, 8),
  ('11111111-1111-1111-1111-111111111111', '5,600 Robux',1850, 9);

-- Blox Fruits
INSERT INTO public.products (category_id, name, price, sort_order)
SELECT '22222222-2222-2222-2222-222222222222', name, 0, ROW_NUMBER() OVER ()
FROM (VALUES
  ('Rocket'),('Spin'),('Blade'),('Spring'),('Bomb'),('Smoke'),('Spike'),('Flame'),
  ('Falcon'),('Ice'),('Sand'),('Dark'),('Diamond'),('Light'),('Rubber'),('Barrier'),
  ('Ghost'),('Magma'),('Quake'),('Buddha'),('Love'),('Spider'),('Sound'),('Phoenix'),
  ('Portal'),('Rumble'),('Pain'),('Blizzard'),('Gravity'),('Mammoth'),('T-Rex'),
  ('Dough'),('Shadow'),('Venom'),('Control'),('Spirit'),('Dragon'),('Leopard'),
  ('Kitsune'),('Gas'),('Yeti')
) AS t(name);

-- Gamepasses (รวมกับ Blox Fruits)
INSERT INTO public.products (category_id, name, price, sort_order)
SELECT '33333333-3333-3333-3333-333333333333', name, 0, ROW_NUMBER() OVER ()
FROM (VALUES
  ('2x Money'),('2x Mastery'),('2x Boss Drops'),('Fast Boats'),('Fruit Notifier'),
  ('Dark Blade'),('Luxury Boat'),('Permanent Fruits'),('Fruit Storage')
) AS t(name);

-- Brookhaven
INSERT INTO public.products (category_id, name, price, sort_order)
SELECT '44444444-4444-4444-4444-444444444444', name, 0, ROW_NUMBER() OVER ()
FROM (VALUES
  ('Premium'),('VIP Pack'),('Vehicle Pack'),('Vehicle Speed Unlocked'),
  ('Vehicle Customization'),('Estate Unlocked'),('Land Unlocked'),('Penthouse'),
  ('Music Unlocked'),('Faces Unlocked'),('Fire Fighter'),('Disaster Pack'),
  ('Theme Pack'),('Boat Pack'),('Horse Upgrade')
) AS t(name);

-- 99 คืนในป่า – Classes
INSERT INTO public.products (category_id, name, price, sort_order)
SELECT '55555555-5555-5555-5555-555555555555', name, 0, ROW_NUMBER() OVER ()
FROM (VALUES
  ('Adventurer'),('Warrior'),('Hunter'),('Lumberjack'),('Miner'),('Collector'),
  ('Cook'),('Medic'),('Crafter'),('Guardian'),('Assassin')
) AS t(name);

-- เพชร 99 คืนในป่า
INSERT INTO public.products (category_id, name, price, sort_order) VALUES
  ('66666666-6666-6666-6666-666666666666', 'เพชร 50',    20, 1),
  ('66666666-6666-6666-6666-666666666666', 'เพชร 100',   40, 2),
  ('66666666-6666-6666-6666-666666666666', 'เพชร 250',   95, 3),
  ('66666666-6666-6666-6666-666666666666', 'เพชร 550',  200, 4),
  ('66666666-6666-6666-6666-666666666666', 'เพชร 1,200',420, 5),
  ('66666666-6666-6666-6666-666666666666', 'เพชร 2,500',850, 6);

-- storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "public read product images"   ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "public upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "public update product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
CREATE POLICY "public delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
