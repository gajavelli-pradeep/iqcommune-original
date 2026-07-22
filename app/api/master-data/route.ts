import { getConsoleSession } from "@/features/console/requireRole";
import { listMasterData, recordActivity } from "@/services/console";

/**
 * Practitioner master data as CSV (V7's "Download selected" / "Download all").
 *
 * Behind the console session rather than a capability: V7 leaves both download
 * buttons ungated and the User role is "view & download only". It is still
 * logged with a count — this is a list of people's phone numbers and email
 * addresses leaving the platform, which is exactly the kind of access an audit
 * trail exists for.
 *
 * `?ids=` limits it to the rows that were ticked; omitting it exports
 * everything.
 */

/**
 * One CSV field.
 *
 * The leading-character guard is not cosmetic: a value starting =, +, - or @ is
 * executed as a formula when the file is opened in Excel or Sheets, so a
 * practitioner whose name or notes began with one could run a command on the
 * machine of whoever opened the export. Prefixing an apostrophe keeps the value
 * readable and inert.
 */
function csvField(value: string): string {
  const risky = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${risky.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const { email: actor } = await getConsoleSession();

  const wanted = new URL(request.url).searchParams.get("ids");
  const ids = wanted ? new Set(wanted.split(",").filter(Boolean)) : null;

  const all = await listMasterData();
  const rows = ids ? all.filter((row) => ids.has(row.id)) : all;

  const header = ["Name", "Phone", "Email", "City", "State"];
  const csv = [
    header.join(","),
    ...rows.map((row) =>
      [row.name, row.phone, row.email, row.city, row.state].map(csvField).join(","),
    ),
  ].join("\r\n");

  void recordActivity({
    actorEmail: actor,
    action: "master_data.exported",
    entityType: "practitioners",
    detail: `${rows.length} record(s)${ids ? ", selection" : ", all"}`,
  });

  const stamp = new Date().toISOString().slice(0, 10);

  // The BOM is the payload, not the header: Excel decides the encoding from the
  // first bytes of the file and ignores the charset in Content-Type.
  return new Response(`﻿${csv}`, {
    headers: {
      // UTF-8 with a BOM so Excel reads accented names correctly rather than as
      // mojibake — without it "Ananya Iyer" is fine but "Zoë" is not.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iqcommune-practitioners-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
