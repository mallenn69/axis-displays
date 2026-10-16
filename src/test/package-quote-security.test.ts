// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const owner = "00000000-0000-0000-0000-000000000001",
  sales = "00000000-0000-0000-0000-000000000002",
  viewer = "00000000-0000-0000-0000-000000000003",
  stranger = "00000000-0000-0000-0000-000000000004";
async function asUser(id: string, sql: string) {
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("RESET ROLE");
  }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated; CREATE TABLE public.axis_staff_members(user_id uuid primary key,role text); ALTER TABLE public.axis_staff_members ENABLE ROW LEVEL SECURITY; GRANT SELECT ON public.axis_staff_members TO authenticated; CREATE POLICY self ON public.axis_staff_members FOR SELECT TO authenticated USING(user_id=auth.uid()); INSERT INTO public.axis_staff_members VALUES ('${owner}','owner'),('${sales}','sales'),('${viewer}','viewer');`,
  );
  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/202610160001_quote_workspace.sql", import.meta.url),
      "utf8",
    ),
  );
}, 20000);
afterAll(async () => {
  await db?.close();
});
it("protects costs and quotes from public visitors and nonstaff accounts", async () => {
  await db.exec("SET ROLE anon");
  await expect(db.query("select * from public.axis_quote_catalog")).rejects.toThrow();
  await expect(db.query("select * from public.axis_package_quotes")).rejects.toThrow();
  await db.exec("RESET ROLE");
  expect((await asUser(stranger, "select * from public.axis_quote_catalog")).rows).toHaveLength(0);
  await expect(
    asUser(stranger, `insert into public.axis_package_quotes(title,payload) values ('Bad','{}')`),
  ).rejects.toThrow();
});
it("allows catalog editing only to owner/admin and quote editing to sales", async () => {
  await asUser(owner, `insert into public.axis_quote_catalog(data) values ('{"private":true}')`);
  expect((await asUser(viewer, "select * from public.axis_quote_catalog")).rows).toHaveLength(1);
  expect(
    (await asUser(sales, `update public.axis_quote_catalog set data='{}' returning *`)).rows,
  ).toHaveLength(0);
  await asUser(
    sales,
    `insert into public.axis_package_quotes(title,payload) values ('Draft','{}')`,
  );
  expect(
    (await asUser(viewer, `update public.axis_package_quotes set title='Bad' returning *`)).rows,
  ).toHaveLength(0);
  await expect(
    asUser(viewer, `insert into public.axis_package_quotes(title,payload) values ('Bad','{}')`),
  ).rejects.toThrow();
});
it("increments revision and rejects a stale conditional update", async () => {
  expect(
    (
      await asUser(
        sales,
        `update public.axis_package_quotes set title='Revised' where revision=1 returning revision`,
      )
    ).rows,
  ).toEqual([{ revision: 2 }]);
  expect(
    (
      await asUser(
        sales,
        `update public.axis_package_quotes set title='Stale' where revision=1 returning revision`,
      )
    ).rows,
  ).toHaveLength(0);
});
