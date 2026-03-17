import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// APIキーをサーバーサイドの環境変数から読み込む
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    // サーバーサイドでのキーチェック
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("GOOGLE_GENERATIVE_AI_API_KEY is not set in Vercel environment variables.");
      return NextResponse.json({ error: "サーバー側でAPIキーが設定されていません。VercelのSettingsを確認してください。" }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "この画像の拾得物を分析し、以下のJSON形式で返してください。余計な解説は含めずJSONのみを出力してください： { \"product_name\": \"品名\", \"category_hint\": \"カテゴリー\", \"description\": \"詳細説明\" }";

    const result = await model.generateContent([
      {
        inlineData: {
          data: image,
          mimeType: "image/jpeg",
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}