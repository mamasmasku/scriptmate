-- ============================================================
-- SCRIPTMATE - Supabase Schema
-- Jalankan ini di Supabase SQL Editor
-- ============================================================

-- 1. Profiles (extend auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  role text default 'free' check (role in ('free', 'pro', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. User Credits
create table public.user_credits (
  user_id uuid references auth.users on delete cascade primary key,
  balance integer default 0,
  total_purchased integer default 0,
  total_used integer default 0,
  updated_at timestamptz default now()
);

-- 3. Credit Packages
create table public.credit_packages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  credits integer not null,
  price_idr integer not null,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Insert default packages
insert into public.credit_packages (name, credits, price_idr, sort_order) values
  ('Starter', 30, 15000, 1),
  ('Basic', 100, 45000, 2),
  ('Pro', 300, 120000, 3),
  ('Unlimited', 1000, 350000, 4);

-- 4. Transactions (Midtrans)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  package_id uuid references public.credit_packages,
  credits integer not null,
  amount_idr integer not null,
  status text default 'pending' check (status in ('pending', 'success', 'failed', 'expired', 'cancel')),
  midtrans_order_id text unique,
  midtrans_transaction_id text,
  payment_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Credit Usage Log
create table public.credit_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  mode text not null,
  segments_used integer default 1,
  description text,
  created_at timestamptz default now()
);

-- 6. Admin Credit Log (manual top-up)
create table public.admin_credit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references auth.users,
  user_id uuid references auth.users,
  credits_added integer not null,
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_credits enable row level security;
alter table public.transactions enable row level security;
alter table public.credit_usage enable row level security;
alter table public.credit_packages enable row level security;
alter table public.admin_credit_logs enable row level security;

-- Profiles: user bisa baca & update milik sendiri
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Credits: user bisa baca milik sendiri
create policy "credits_select_own" on public.user_credits for select using (auth.uid() = user_id);

-- Transactions: user bisa baca milik sendiri
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);

-- Credit packages: semua bisa baca
create policy "packages_select_all" on public.credit_packages for select using (true);

-- Credit usage: user bisa baca milik sendiri
create policy "usage_select_own" on public.credit_usage for select using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile + credits saat user baru daftar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'free'
  );
  insert into public.user_credits (user_id, balance) values (new.id, 0);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function deduct credits (atomic, server-side only)
create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_mode text,
  p_description text default ''
)
returns json language plpgsql security definer as $$
declare
  v_balance integer;
begin
  select balance into v_balance from public.user_credits where user_id = p_user_id for update;
  if v_balance is null then
    return json_build_object('success', false, 'error', 'User not found');
  end if;
  if v_balance < p_amount then
    return json_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_balance);
  end if;
  update public.user_credits
    set balance = balance - p_amount,
        total_used = total_used + p_amount,
        updated_at = now()
    where user_id = p_user_id;
  insert into public.credit_usage (user_id, mode, segments_used, description)
    values (p_user_id, p_mode, p_amount, p_description);
  return json_build_object('success', true, 'new_balance', v_balance - p_amount);
end;
$$;

-- Function add credits (untuk admin & webhook Midtrans)
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer
)
returns void language plpgsql security definer as $$
begin
  update public.user_credits
    set balance = balance + p_amount,
        total_purchased = total_purchased + p_amount,
        updated_at = now()
    where user_id = p_user_id;
end;
$$;

-- ============================================================
-- SETUP ADMIN USER
-- Setelah register, jalankan ini dengan ganti EMAIL_ADMIN_KAMU
-- ============================================================
-- update public.profiles set role = 'admin' 
-- where id = (select id from auth.users where email = 'EMAIL_ADMIN_KAMU');
