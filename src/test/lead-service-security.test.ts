// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/202610110001_axis_leads.sql", import.meta.url),
      "utf8",
    ),
  );
}, 20000);
afterAll(async () => {
  await db?.close();
});
it("blocks anonymous and ordinary signed-in reads of leads, webhook secrets, and delivery records", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      for (const table of ["church_leads", "axis_crm_settings", "axis_crm_deliveries"])
        await expect(db.query(`select * from public.${table}`)).rejects.toThrow();
      await expect(
        db.query(
          "select * from public.axis_claim_delivery('00000000-0000-0000-0000-000000000001')",
        ),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  }
});
it("prevents self-promoting to staff and keeps photos private", async () => {
  await db.exec("set role authenticated");
  try {
    await expect(
      db.exec(
        "insert into public.axis_staff_members values ('00000000-0000-0000-0000-000000000001','owner',now())",
      ),
    ).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
  expect(
    (await db.query<{ public: boolean }>("select public from storage.buckets")).rows[0]?.public,
  ).toBe(false);
});
it("makes inquiry submission IDs unique and delivery claims exclusive", async () => {
  const id = "00000000-0000-0000-0000-000000000001";
  const insert = `insert into public.church_leads(id,submission_id,name,phone,email,church_name,state,description) values ('${id}','${id}','Test','2025550100','test@example.com','Test church','Arizona','Test inquiry')`;
  await db.exec(insert);
  await expect(db.exec(insert)).rejects.toThrow();
  await db.exec(`insert into public.axis_crm_deliveries(lead_id) values('${id}')`);
  expect((await db.query(`select * from public.axis_claim_delivery('${id}')`)).rows).toHaveLength(
    1,
  );
  expect((await db.query(`select * from public.axis_claim_delivery('${id}')`)).rows).toHaveLength(
    0,
  );
  await db.exec(`update public.axis_crm_deliveries set status='failed' where lead_id='${id}'`);
  const retry = await db.query<{ attempts: number }>(
    `select * from public.axis_claim_delivery('${id}')`,
  );
  expect(retry.rows[0]?.attempts).toBe(2);
  await db.exec(`update public.axis_crm_deliveries set status='delivered' where lead_id='${id}'`);
  expect((await db.query(`select * from public.axis_claim_delivery('${id}')`)).rows).toHaveLength(
    0,
  );
});
it("limits intake attempts and allows a new time window", async () => {
  for (let i = 0; i < 10; i++)
    expect(
      (await db.query<{ allowed: boolean }>("select public.axis_check_intake('test') as allowed"))
        .rows[0]?.allowed,
    ).toBe(true);
  expect(
    (await db.query<{ allowed: boolean }>("select public.axis_check_intake('test') as allowed"))
      .rows[0]?.allowed,
  ).toBe(false);
  await db.exec("update public.axis_intake_limits set window_start=now()-interval '2 hours'");
  expect(
    (await db.query<{ allowed: boolean }>("select public.axis_check_intake('test') as allowed"))
      .rows[0]?.allowed,
  ).toBe(true);
});
