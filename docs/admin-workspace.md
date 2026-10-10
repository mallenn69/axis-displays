# Private Axis workspace

`/admin` provides email/password login, a lead inbox with status updates, and internal quote drafts with editable line items, cent-based totals and linked inquiries. Saving a quote does not send it or create a binding proposal. No signup UI or browser credential provisioning is included.

## Activation

1. Apply `drizzle/migrations/0002_private_workspace.sql` to the existing Supabase/Lovable database through its normal migration workflow. Do not re-run the earlier migrations on an existing installation.
2. In Supabase Authentication, disable public user signup and keep email/password sign-in enabled. Create the initial account through the trusted admin console; the account holder should set their own password. This setting is external to the website repository.
3. Add the account's auth UUID to `public.staff_members` using a trusted SQL session:

   ```sql
   insert into public.staff_members (user_id, role)
   values ('REPLACE_WITH_AUTH_USER_UUID', 'owner');
   ```

4. Deploy the app and sign in at `/admin`. Verify access with owner, viewer, uninvited and signed-out accounts before using real customer records.

The repository has only publishable client credentials available for this work. The migration and account provisioning have not been applied to the live service. Do not put an admin password, service-role key or secret key into client environment variables or this repository.

## Access model

Owner, admin and sales can read leads/builds and create/update drafts. Viewer can only read. Staff membership can only be provisioned by a trusted backend/database administrator; the browser cannot promote itself. Public inquiry/build insert policies are preserved. Only the lead status column is editable by staff. Draft creator and creation timestamps are protected by column grants; updates stamp a new timestamp. Saving an existing draft checks that timestamp to detect concurrent edits.

The UI shows the latest 200 leads and 200 drafts, with local search/filtering. User management, MFA setup, PDF exports, proposal delivery/acceptance, audit logs and full catalog/CMS are future work. Draft totals exclude taxes/shipping unless explicitly entered as line items. Product values remain unconfirmed manufacturer placeholders.

## Validation

`npm test` executes the migration in embedded PostgreSQL (PGlite) with anonymous/authenticated roles. It checks public insert-only access, membership enforcement, viewer restrictions, prohibited column writes, malformed line-item rejection and stale-edit detection. These tests do not replace validation of the live service's auth settings and existing grants.
