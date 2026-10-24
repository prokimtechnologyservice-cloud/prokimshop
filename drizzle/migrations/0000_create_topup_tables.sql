-- Game top-up catalog: items the game server (e.g. prokim_city map) can deliver
create table public.topup_items (
  id uuid primary key default gen_random_uuid(),
  game_place text not null default 'prokim_city',
  name text not null,
  item_id text not null,
  price numeric not null check (price >= 0),
  image_url text,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Game top-up orders created by customers paying from their web balance
create table public.topup_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  roblox_username text not null,
  roblox_user_id bigint,
  item_name text not null,
  item_id text not null,
  quantity integer not null default 1 check (quantity between 1 and 999),
  price numeric not null check (price >= 0),
  status text not null default 'pending' check (status in ('pending','delivered','failed','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  game_place text not null
);

create index topup_orders_queue_idx on public.topup_orders (game_place, status, payment_status, created_at);
create index topup_orders_user_idx on public.topup_orders (user_id, created_at);
create index topup_items_active_idx on public.topup_items (active, sort_order);

-- Locked tables: no browser-key grants. Customers only ever see their own rows
-- through the session-checked gateway (server forces user_id), staff through
-- the staff gateway, and the game server through API-key endpoints.
alter table public.topup_items enable row level security;
alter table public.topup_orders enable row level security;

grant all on public.topup_items to service_role;
grant all on public.topup_orders to service_role;