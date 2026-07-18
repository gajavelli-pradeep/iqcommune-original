import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { PHOTO_SHOT_LIST } from "@/lib/photo-guide";

export const dynamic = "force-dynamic";

// Op-procedure Part 4 step 23: download the photo guide (the 8-shot checklist) to
// send the practitioner ahead of the session. Session-independent (same shots for all).
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  let y = M + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(138, 101, 16);
  doc.text("SESSION PHOTO GUIDE", W / 2, y, { align: "center" });

  y += 10;
  doc.setFontSize(20);
  doc.setTextColor(20, 22, 29);
  doc.text("iqcommune", W / 2, y, { align: "center" });

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(56, 59, 71);
  doc.text("Eight shots to capture during your session — all on your phone.", W / 2, y, { align: "center" });

  y += 14;
  PHOTO_SHOT_LIST.forEach((s, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 22, 29);
    doc.text(`${i + 1}.  ${s.title}`, M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(56, 59, 71);
    doc.text(s.hint, M + 6, y);
    y += 11;
  });

  const pdf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="iqcommune-photo-guide.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
