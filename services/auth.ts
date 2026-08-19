import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { type ConsoleRole } from "@/constants/roles";

import { AlreadyRecordedError } from "./link-writes";

/**
 * Account creation for invited console users.
 *
 * The role is written into `app_metadata`, never `user_metadata`: the latter is
 * writable by the user themselves, so a permission stored there could be raised
 * by the account it governs. This is the whole reason the invite decides the
 * role rather than the person accepting it.
 *
 * The role type is `ConsoleRole` — the single declaration (audit C3/0D): a
 * second `AdminRole` enum could drift from it with no compile error.
 */

export interface CreatedAccount {
  userId: string;
  email: string;
}

export async function createInvitedAccount(
  email: string,
  password: string,
  role: ConsoleRole,
  fullName: string,
): Promise<CreatedAccount> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    // The invite was the verification. Requiring a second confirmation email
    // would strand the account behind a link nobody sent.
    email_confirm: true,
    app_metadata: { role },
    // `user_metadata`, not `app_metadata` (client, 2026-08-19): a name is the
    // account's own to hold, unlike the role above — it changes nothing about
    // what the account can do. `listTeam()` (services/console.ts) already
    // reads `user_metadata.full_name` for the Team & Access table; this is
    // what starts giving it something other than the email's local-part.
    user_metadata: { full_name: fullName },
  });

  if (error) {
    // Supabase reports an existing address as a 422. Treated as "already done"
    // rather than a fault: the person has an account, which is what they came
    // for, and telling them something broke would send them round again.
    if (error.status === 422) {
      throw new AlreadyRecordedError("An account already exists for this email address.");
    }
    throw new Error(`auth user creation failed: ${error.message}`);
  }

  return { userId: data.user.id, email: data.user.email ?? email };
}