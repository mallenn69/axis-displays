import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { QuoteDraft, DraftInput, StaffRole } from "@/config/admin";

type AdminDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      staff_members: {
        Row: { user_id: string; role: StaffRole };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      quote_drafts: {
        Row: QuoteDraft;
        Insert: DraftInput;
        Update: Partial<DraftInput>;
        Relationships: [];
      };
    };
  };
};
// Same authenticated client/session; RLS is the authority for every request.
export const adminDb = supabase as unknown as SupabaseClient<AdminDatabase>;
export type Lead = Database["public"]["Tables"]["quote_requests"]["Row"];
