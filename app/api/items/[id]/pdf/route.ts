import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";
import { formatDateTime, getOwnershipDate, getPoliceDeadline } from "@/lib/dates";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response("Supabase 設定が不足しています。", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from("lost_items")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return new Response("データ取得に失敗しました。", { status: 404 });
  }

  const foundAt = new Date(data.found_at);
  const policeDeadline = getPoliceDeadline(foundAt);
  const ownershipDate = getOwnershipDate(foundAt);

  const doc = new PDFDocument({ margin: 50 });

  const stream = doc as unknown as NodeJS.ReadableStream;

  doc.fontSize(16).text("拾得物届出書", { align: "center" });
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`管理番号: ${data.management_number}`);
  doc.text(`ステータス: ${data.status}`);
  doc.text(`拾得日時: ${formatDateTime(foundAt)}`);
  doc.text(`拾得場所: ${data.location}`);
  doc.text(`品名: ${data.name}`);
  doc.text(`特徴: ${data.description ?? ""}`);
  doc.moveDown();

  doc.text(`警察提出期限（拾得から7日以内）: ${formatDateTime(policeDeadline)}`);
  doc.text(`所有権取得日（拾得から90日後）: ${formatDateTime(ownershipDate)}`);

  doc.end();

  return new Response(stream as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="lost-item-${data.management_number}.pdf"`
    }
  });
}

