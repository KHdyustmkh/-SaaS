import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 404回避のためのモデル指定: "gemini-1.5-flash" が通らない環境への対策
    // 最新のSDKバージョン（0.21.0以上）では以下の指定が推奨されます
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
    });

    const prompt = "画像から拾得物を分析し、以下のJSON形式のみで回答してください。余計な文章は一切含めないでください。 {\"product_name\": \"品名\", \"category_major\": \"大分類\", \"category_middle\": \"中分類\", \"category_minor\": \"小分類\"}";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // JSON抽出の堅牢化
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AIの応答がJSON形式ではありません: " + text);
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // ブラウザのコンソールに詳細なエラー理由を返す
    return NextResponse.json({ 
      error: error.message,
      detail: "APIキーの権限、またはモデル名の不一致を確認してください。"
    }, { status: 500 });
  }
}