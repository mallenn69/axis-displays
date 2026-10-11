-- Dedicated lead service. All customer data is accessible only to authorized staff.
create table public.axis_staff_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','sales','viewer')),
 created_at timestamptz not null default now()
);
alter table public.axis_staff_members enable row level security;
revoke all on public.axis_staff_members from anon, authenticated;
grant select on public.axis_staff_members to authenticated;
grant all on public.axis_staff_members to service_role;
create policy "Read own Axis membership" on public.axis_staff_members for select to authenticated using(user_id=(select auth.uid()));
create table public.church_leads (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid unique not null,
 name text not null check(length(trim(name)) between 1 and 100),
 phone text not null check(length(trim(phone)) between 7 and 40),
 email text not null check(length(email) between 3 and 254),
 church_name text not null check(length(trim(church_name)) between 1 and 150),
 state text not null check(length(state) between 2 and 100),
 description text not null check(length(trim(description)) between 1 and 3000),
 status text not null default 'new' check(status in ('new','contacted','qualified','closed')),
 notes text not null default '' check(length(notes)<=5000),
 photo_path text,
 source text not null default 'facebook',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index church_leads_created on public.church_leads(created_at desc);
alter table public.church_leads enable row level security;
revoke all on public.church_leads from anon,authenticated;
grant all on public.church_leads to service_role;
create table public.axis_crm_settings (
 id boolean primary key default true check(id),
 webhook_url text,
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.axis_crm_settings(id) values(true);
alter table public.axis_crm_settings enable row level security;
revoke all on public.axis_crm_settings from anon,authenticated;
grant all on public.axis_crm_settings to service_role;
create table public.axis_crm_deliveries (
 lead_id uuid primary key references public.church_leads(id) on delete cascade,
 event_id uuid unique not null default gen_random_uuid(),
 status text not null default 'pending' check(status in ('pending','sending','delivered','failed')),
 attempts integer not null default 0,
 locked_at timestamptz,
 delivered_at timestamptz,
 last_error text
);
alter table public.axis_crm_deliveries enable row level security;
revoke all on public.axis_crm_deliveries from anon,authenticated;
grant all on public.axis_crm_deliveries to service_role;
create function public.axis_claim_delivery(target uuid) returns setof public.axis_crm_deliveries
language sql security definer set search_path='' as $$
 update public.axis_crm_deliveries set status='sending',attempts=attempts+1,locked_at=now()
 where lead_id=target and (status in ('pending','failed') or (status='sending' and locked_at < now()-interval '2 minutes')) returning *;
$$;
revoke all on function public.axis_claim_delivery(uuid) from public,anon,authenticated;
grant execute on function public.axis_claim_delivery(uuid) to service_role;
create table public.axis_intake_limits (key text primary key, window_start timestamptz not null, attempts integer not null);
alter table public.axis_intake_limits enable row level security;
revoke all on public.axis_intake_limits from anon,authenticated;
grant all on public.axis_intake_limits to service_role;
create function public.axis_check_intake(key_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare total integer;
begin
 delete from public.axis_intake_limits where window_start < now()-interval '1 day';
 insert into public.axis_intake_limits(key,window_start,attempts) values(key_hash,now(),1)
 on conflict(key) do update set attempts=case when axis_intake_limits.window_start < now()-interval '1 hour' then 1 else axis_intake_limits.attempts+1 end,
 window_start=case when axis_intake_limits.window_start < now()-interval '1 hour' then now() else axis_intake_limits.window_start end
 returning attempts into total;
 return total<=10;
end;
$$;
revoke all on function public.axis_check_intake(text) from public,anon,authenticated;
grant execute on function public.axis_check_intake(text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('sanctuary-photos','sanctuary-photos',false,8388608,array['image/jpeg','image/png','image/webp']);
-- No public Storage policies: upload and short-lived viewing URLs are issued by the function.
