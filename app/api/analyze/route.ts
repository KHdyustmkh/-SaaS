import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// サーバー起動時に一度だけインスタンス化
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Vercelの環境変数にAPIキーが設定されていません。" }, { status: 500 });
    }

    // apiVersionなどの余計なオプションを一切排除
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "この画像の拾得物を分析し、以下のJSON形式のみで返してください。説明は一切不要です: { \"product_name\": \"品名\", \"category_hint\": \"カテゴリ\" }";

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
    return NextResponse.json({ text: response.text() });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // エラーメッセージをフロントエンドに詳しく返す
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}// force rebuild 1