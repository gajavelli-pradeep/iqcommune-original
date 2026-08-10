import { fail, ok } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keepalive — one trivial query so Supabase sees database activity.
 *
 * A free-tier project pauses after about a week with no activity, and a paused
 * database means every page 500s until someone restores it by hand. Vercel Cron
 * calls this twice a day (see `vercel.json`).
 *
 * It has to be a route that reaches Postgres. Pinging `/` would not: that page
 * is statically prerendered and answered from Vercel's CDN, so Vercel would show
 * traffic while Supabase saw none and paused anyway. Route Handlers are not
 * cached in this version of Next, and reading the request header below keeps
 * this one dynamic regardless — do not add `force-static` here, it would turn
 * the whole thing into a no-op that still looks healthy.
 *
 * `gallery_photos` is the least sensitive table in the schema — published
 * photos, no personal data — and one id is the smallest thing worth asking for.
 * An empty table is a pass: the query still reached Postgres, which is the
 * entire point.
 *
 * This is a workaround, not a guarantee. Supabase decides what counts as
 * activity. It also does nothing about the free tier having no backups, which is
 * the larger risk with this database.
 */
export async function GET(request: Request) {
  const traceId = newTraceId();
  const secret = process.env.CRON_SECRET;

  // Fail closed. Without the secret Vercel sends no Authorization header, and
  // accepting the call anyway would leave an open endpoint anyone can loop on.
  if (!secret) {
    log.error(traceId, "keepalive not run — CRON_SECRET is unset", { route: "keepalive" });
    return fail("INTERNAL", "Keepalive is not configured.", traceId);
  }

  // Vercel attaches this header to cron invocations automatically.
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    log.warn(traceId, "keepalive rejected — bad or missing cron authorization", {
      route: "keepalive",
    });
    return fail("UNAUTHORIZED", "Not authorised.", traceId);
  }

  const { error } = await createAdminClient().from("gallery_photos").select("id").limit(1);

  if (error) {
    // The one outcome worth an alert: the database is unreachable, which is the
    // state this route exists to prevent.
    log.error(traceId, "keepalive query failed", { route: "keepalive", error: error.message });
    return fail("INTERNAL", "Keepalive query failed.", traceId);
  }

  // Logged on success too. A keepalive that dies quietly is the usual way this
  // pattern fails — the log is what makes it visible before the pause.
  log.info(traceId, "keepalive ok", { route: "keepalive" });
  return ok({ alive: true });
}
