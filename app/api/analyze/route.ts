import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// サーバー側で環境変数を読み込むため、ブラウザのエラーを回避します
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "画像データが不足しています" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "この画像の拾得物を分析し、以下のJSON形式で返してください： { \"product_name\": \"品名\", \"category_hint\": \"カテゴリー\", \"description\": \"詳細説明\" }";

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: image, mimeType: "image/jpeg" } },
    ]);

    const text = result.response.text();
    // 余計な文字を排除してJSONとしてパース
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(jsonStr));
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}