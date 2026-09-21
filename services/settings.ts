import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Console-editable settings (migration 0023).
 *
 * Every read defaults to the site's normal behaviour: a missing row, a missing
 * table (0023 not applied yet) or a failed read must never hide something from
 * the public site.
 */

const GALLERY_KEY = "landing.gallery_visible";

/** Whether the home page shows "Sessions in the room". True unless switched off. */
export async function isGalleryVisible(): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient()
      .from("app_settings")
      .select("value")
      .eq("key", GALLERY_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // A `value` column that predates 0023 may be text, so "off" can come back as
    // the string "false" rather than the boolean.
    return !(data?.value === false || data?.value === "false");
  } catch (cause) {
    console.error("[settings] gallery visibility read failed, showing it:", cause);
    return true;
  }
}

export async function setGalleryVisible(visible: boolean, actorEmail: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key: GALLERY_KEY, value: visible, updated_by_email: actorEmail, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
