// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
it('isolates reports to staff, validates intake, and deduplicates events',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; create table axis_staff_members(user_id uuid,role text); create table church_leads(state text,created_at timestamptz,name text);`);
 await db.exec(readFileSync(new URL('../../supabase/migrations/202610120001_traffic.sql',import.meta.url),'utf8'));
 await db.exec(`set role anon; select set_config('request.headers','{"origin":"https://axisledwalls.com","cf-ipcountry":"US"}',false);`);
 const sql=`select public.axis_track_event('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','/build/','page_view','Facebook','Mobile')`;
 await db.exec(sql);await db.exec(sql);
 await expect(db.query('select * from axis_traffic')).rejects.toThrow();
 await expect(db.query('select axis_traffic_summary()')).rejects.toThrow();
 await db.exec('set role authenticated');await expect(db.query('select axis_traffic_summary()')).rejects.toThrow();
 await db.exec(`reset role; insert into axis_staff_members values('00000000-0000-4000-8000-000000000003','owner'); select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);set role authenticated;`);
 const result=await db.query<{stats:{views:number;visits:number;countries:{label:string}[]}}>('select axis_traffic_summary() as stats');expect(result.rows[0]!.stats.views).toBe(1);expect(result.rows[0]!.stats.visits).toBe(1);expect(result.rows[0]!.stats.countries[0]!.label).toBe('US');
 await db.exec(`select set_config('request.headers','{"origin":"https://other.example"}',false)`);await expect(db.exec(sql)).rejects.toThrow();
 }finally{await db.close();}
},20000);
