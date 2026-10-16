-- Internal costing: no catalog values are shipped in the public website bundle.
create table public.axis_quote_catalog (
 id boolean primary key default true check(id),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<100000),
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.axis_package_quotes (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 150),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<250000),
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.axis_quote_catalog enable row level security;
alter table public.axis_package_quotes enable row level security;
revoke all on public.axis_quote_catalog,public.axis_package_quotes from anon,authenticated;
grant select,insert,update on public.axis_quote_catalog,public.axis_package_quotes to authenticated;
grant all on public.axis_quote_catalog,public.axis_package_quotes to service_role;
create policy "Axis staff read catalog" on public.axis_quote_catalog for select to authenticated using(exists(select 1 from public.axis_staff_members where user_id=(select auth.uid()) and role in ('owner','admin','sales','viewer')));
create policy "Axis owners create catalog" on public.axis_quote_catalog for insert to authenticated with check(exists(select 1 from public.axis_staff_members where user_id=(select auth.uid()) and role in ('owner','admin')));
create policy "Axis owners update catalog" on public.axis_quote_catalog for update to authenticated using(exists(select 1 from public.axis_staff_members where user_id=(select auth.uid()) and role in ('owner','admin'))) with check(exists(select 1 from public.axis_staff_members where user_id=(select auth.uid()) and role in ('owner','admin')));
create policy "Axis staff read quotes" on public.axis_package_quotes for select to authenticated using(exists(select 1 from public.axis_staff_members where user_id=(select auth.uid()) and role in ('owner','admin','sales','viewer')));
create policy "Axis editors create quotes" on public.axis_package_quotes for insert to authenticated with check(exists(select 1 from public.axis_staff_members where user_id=(select auth.uid()) and role in ('owner','admin','sales')));
create policy "Axis editors update quotes" on public.axis_package_quotes for update to authenticated using(exists(select 1 from public.axis_staff_members where user_id=(select auth.uid()) and role in ('owner','admin','sales'))) with check(exists(select 1 from public.axis_staff_members where user_id=(select auth.uid()) and role in ('owner','admin','sales')));
create function public.axis_quote_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision := old.revision+1; new.updated_at := now(); return new; end; $$;
create trigger axis_catalog_revision before update on public.axis_quote_catalog for each row execute function public.axis_quote_revision();
create trigger axis_package_revision before update on public.axis_package_quotes for each row execute function public.axis_quote_revision();
create index axis_package_quotes_updated on public.axis_package_quotes(updated_at desc);
