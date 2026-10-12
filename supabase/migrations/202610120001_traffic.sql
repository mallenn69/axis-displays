create table if not exists public.axis_traffic (
 id uuid primary key, visit uuid not null, created_at timestamptz not null default now(),
 page text not null check(page in ('/','/build/','/start/')),
 event text not null check(event in ('page_view','quote_submitted')),
 source text not null check(source in ('Direct','Facebook','Instagram','Google','Other')),
 device text not null check(device in ('Mobile','Desktop')),
 country text not null default 'Unknown'
);
create index if not exists axis_traffic_date on public.axis_traffic(created_at);
create index if not exists axis_traffic_visit on public.axis_traffic(visit,created_at);
alter table public.axis_traffic enable row level security;
revoke all on public.axis_traffic from anon, authenticated;
create or replace function public.axis_track_event(event_id uuid, visit_id uuid, page_path text, event_name text, traffic_source text, device_type text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare h jsonb := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb; country_code text;
begin
 if coalesce(h->>'origin','') not in ('https://axisledwalls.com','https://www.axisledwalls.com') then raise exception 'Origin not allowed'; end if;
 if event_id is null or visit_id is null then raise exception 'Missing identifier'; end if;
 if page_path not in ('/','/build/','/start/') or event_name not in ('page_view','quote_submitted') or traffic_source not in ('Direct','Facebook','Instagram','Google','Other') or device_type not in ('Mobile','Desktop') then raise exception 'Invalid event'; end if;
 perform pg_advisory_xact_lock(hashtext(visit_id::text));
 if (select count(*) from axis_traffic where visit=visit_id and created_at>now()-interval '1 day') >= 100 then return; end if;
 country_code := upper(coalesce(h->>'cf-ipcountry',''));
 if country_code !~ '^[A-Z]{2}$' or country_code in ('XX','T1') then country_code := 'Unknown'; end if;
 insert into axis_traffic(id,visit,page,event,source,device,country) values(event_id,visit_id,page_path,event_name,traffic_source,device_type,country_code) on conflict(id) do nothing;
end $$;
revoke all on function public.axis_track_event(uuid,uuid,text,text,text,text) from public;
grant execute on function public.axis_track_event(uuid,uuid,text,text,text,text) to anon, authenticated;
create or replace function public.axis_traffic_summary() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from axis_staff_members where user_id=auth.uid() and role in ('owner','admin','sales','viewer')) then raise exception 'Staff access required'; end if;
 with recent as (select * from axis_traffic where created_at>=now()-interval '30 days'),
 pages as (select page as label,count(*) as count from recent where event='page_view' group by page),
 sources as (select source as label,count(distinct visit) as count from recent where event='page_view' group by source),
 countries as (select country as label,count(distinct visit) as count from recent where event='page_view' group by country),
 daily as (select to_char(created_at at time zone 'America/Phoenix','YYYY-MM-DD') as label,count(*) as count from recent where event='page_view' group by 1),
 regions as (select state as label,count(*) as count from church_leads where created_at>=now()-interval '30 days' and name not ilike '%test%' group by state)
 select jsonb_build_object('views',(select count(*) from recent where event='page_view'),'visits',(select count(distinct visit) from recent where event='page_view'),'builder',(select count(distinct visit) from recent where event='page_view' and page='/build/'),'quotes',(select count(*) from recent where event='quote_submitted'),'mobile',(select count(*) from recent where event='page_view' and device='Mobile'),'pages',coalesce((select jsonb_agg(pages order by count desc) from pages),'[]'),'sources',coalesce((select jsonb_agg(sources order by count desc) from sources),'[]'),'countries',coalesce((select jsonb_agg(countries order by count desc) from countries),'[]'),'daily',coalesce((select jsonb_agg(daily order by label) from daily),'[]'),'leadLocations',coalesce((select jsonb_agg(regions order by count desc) from regions),'[]')) into result;
 return result;
end $$;
revoke all on function public.axis_traffic_summary() from public,anon;
grant execute on function public.axis_traffic_summary() to authenticated;
