// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { draftSchema, draftTotal, canEdit } from "@/config/admin";

let db: PGlite;
const owner = "00000000-0000-0000-0000-000000000001";
const viewer = "00000000-0000-0000-0000-000000000002";
const stranger = "00000000-0000-0000-0000-000000000003";
const draft = {
  title: "Sanctuary",
  customer_name: "Example church",
  customer_email: "",
  quote_request_id: null,
  notes: "",
  line_items: [{ description: "Cabinet", quantity: 2, unit_price_cents: 125099 }],
};
async function asUser(id: string, sql: string) {
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${id}', false);`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("RESET ROLE");
  }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
    INSERT INTO auth.users VALUES ('${owner}'),('${viewer}'),('${stranger}');`);
  for (const file of [
    "0000_create_quote_requests",
    "0001_create_wall_builds",
    "0002_private_workspace",
  ]) {
    await db.exec(
      readFileSync(new URL(`../../drizzle/migrations/${file}.sql`, import.meta.url), "utf8"),
    );
  }
  await db.exec(`INSERT INTO public.staff_members (user_id, role) VALUES ('${owner}','owner'),('${viewer}','viewer');
    INSERT INTO public.quote_requests (name,church_name,role,email,city,state) VALUES ('Test','Example','Pastor','test@example.com','Phoenix','AZ');`);
}, 20000);
afterAll(async () => {
  await db?.close();
});

describe("private workspace database boundary", () => {
  it("lets visitors submit inquiries but never read them", async () => {
    await db.exec("SET ROLE anon");
    try {
      await db.exec(
        "INSERT INTO public.quote_requests (name,church_name,role,email,city,state) VALUES ('Visitor','Example','Pastor','visitor@example.com','Phoenix','AZ')",
      );
      await expect(db.query("SELECT * FROM public.quote_requests")).rejects.toThrow();
      await expect(db.query("SELECT * FROM public.quote_drafts")).rejects.toThrow();
    } finally {
      await db.exec("RESET ROLE");
    }
  });
  it("denies uninvited authenticated users and role self-promotion", async () => {
    expect((await asUser(stranger, "SELECT * FROM public.quote_requests")).rows).toHaveLength(0);
    expect((await asUser(stranger, "SELECT * FROM public.staff_members")).rows).toHaveLength(0);
    await expect(
      asUser(
        stranger,
        `INSERT INTO public.staff_members(user_id,role) VALUES ('${stranger}','owner')`,
      ),
    ).rejects.toThrow();
  });
  it("allows authorized drafts, protects creator identity and restricts lead writes", async () => {
    const result = await asUser(
      owner,
      `INSERT INTO public.quote_drafts(title,customer_name,line_items) VALUES ('Sanctuary','Example','${JSON.stringify(draft.line_items)}') RETURNING *`,
    );
    expect(result.rows).toHaveLength(1);
    expect((result.rows[0] as { created_by: string }).created_by).toBe(owner);
    await expect(
      asUser(owner, `UPDATE public.quote_drafts SET created_by='${stranger}'`),
    ).rejects.toThrow();
    await expect(
      asUser(owner, "UPDATE public.quote_requests SET email='other@example.com'"),
    ).rejects.toThrow();
    expect(
      (await asUser(owner, "UPDATE public.quote_requests SET status='qualified' RETURNING id")).rows
        .length,
    ).toBeGreaterThan(0);
  });
  it("allows viewers to read but not create or update", async () => {
    expect((await asUser(viewer, "SELECT * FROM public.quote_drafts")).rows).toHaveLength(1);
    expect(
      (await asUser(viewer, "UPDATE public.quote_drafts SET title='Changed' RETURNING id")).rows,
    ).toHaveLength(0);
    await expect(
      asUser(
        viewer,
        `INSERT INTO public.quote_drafts(title,customer_name,line_items) VALUES ('No','Example','${JSON.stringify(draft.line_items)}')`,
      ),
    ).rejects.toThrow();
    expect(
      (await asUser(viewer, "UPDATE public.quote_requests SET status='closed' RETURNING id")).rows,
    ).toHaveLength(0);
  });
  it("rejects malformed pricing even when bypassing client validation", async () => {
    for (const lines of [
      "[]",
      "[{}]",
      '[{"description":"x","quantity":-1,"unit_price_cents":10}]',
      '[{"description":"x","quantity":1,"unit_price_cents":0.2}]',
    ]) {
      await expect(
        asUser(
          owner,
          `INSERT INTO public.quote_drafts(title,customer_name,line_items) VALUES ('No','Example','${lines}')`,
        ),
      ).rejects.toThrow();
    }
  });
  it("prevents stale writes through version matching", async () => {
    const rows = await asUser(
      owner,
      "SELECT id,updated_at::text AS stamp FROM public.quote_drafts",
    );
    const row = rows.rows[0] as { id: string; stamp: string };
    expect(
      (
        await asUser(
          owner,
          `UPDATE public.quote_drafts SET title='Updated' WHERE id='${row.id}' AND updated_at='${row.stamp}' RETURNING id`,
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(
          owner,
          `UPDATE public.quote_drafts SET title='Stale' WHERE id='${row.id}' AND updated_at='${row.stamp}' RETURNING id`,
        )
      ).rows,
    ).toHaveLength(0);
  });
});

it("validates quotes and calculates in integer cents", () => {
  expect(draftSchema.parse(draft)).toEqual(draft);
  expect(draftTotal(draft.line_items)).toBe(250198);
  expect(draftSchema.safeParse({ ...draft, line_items: [] }).success).toBe(false);
  expect(canEdit("viewer")).toBe(false);
  expect(canEdit("sales")).toBe(true);
});
