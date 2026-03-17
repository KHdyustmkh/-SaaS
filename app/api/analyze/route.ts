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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      "画像から拾得物を分析し、以下のJSON形式のみで回答してください。余計な文章は一切含めないでください。 {\"product_name\": \"品名\", \"item_type\": \"小分類\", \"description\": \"特徴(30文字以内)\"}",
      {
        inlineData: {
          data: image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("AIの応答形式が不正です");
    
    return NextResponse.json(JSON.parse(jsonMatch[0]));

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}