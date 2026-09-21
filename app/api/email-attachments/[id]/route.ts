import { getConsoleSession } from "@/features/console/requireRole";
import { readLibraryFile } from "@/services/email-attachments";

/**
 * Previews one saved email attachment (the eye icon in the draft dialog).
 *
 * Behind the console session, every role: previewing is read-only. The bucket
 * is private, so this route is the only way a browser sees the bytes.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await getConsoleSession();
  const { id } = await params;
  const file = await readLibraryFile(id);
  if (!file) return new Response("No such file.", { status: 404 });

  return new Response(file.bytes as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
