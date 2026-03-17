import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// サーバーサイドで実行されるため、APIキーは安全に読み込まれます
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "画像データがありません" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 以前のプロンプトと形式を完全に維持
    const prompt = "この画像の拾得物を分析し、以下のJSON形式で返してください： { \"product_name\": \"品名\", \"category_hint\": \"カテゴリー\", \"description\": \"詳細説明\" }";

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: image, mimeType: "image/jpeg" } },
    ]);

    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json|```/g, "").trim();
    
    return NextResponse.json(JSON.parse(jsonStr));
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: "AI解析に失敗しました" }, { status: 500 });
  }
}