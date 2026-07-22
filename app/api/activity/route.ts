import { requireCapability } from "@/features/console/requireRole";
import { ACTIVITY_PAGE_SIZE, listActivity } from "@/services/console";

/**
 * One page of the audit trail, for the Activity tab's pager.
 *
 * Behind `viewActivity` — Global Admin only, the same gate as the tab itself.
 * A paging endpoint is exactly the kind of route that gets forgotten and left
 * open, and this one returns who did what across every practitioner and
 * session.
 *
 * Deliberately not logged: reading the audit trail would otherwise append to
 * the audit trail, and paging through it would bury the actions it exists to
 * record under a wall of "someone looked at this".
 */
export async function GET(request: Request) {
  await requireCapability("viewActivity");

  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page")) || 1;

  const result = await listActivity(page, ACTIVITY_PAGE_SIZE);

  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
