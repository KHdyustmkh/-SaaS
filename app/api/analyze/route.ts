import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image, mimeType: mimeTypeInput } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "画像データが不正です" }, { status: 400 });
    }

    const base64Data = image.includes("base64,") ? image.split("base64,")[1] : image;
    const detectMimeType = (base64: string) => {
      const head = base64.slice(0, 12);
      if (head.startsWith("/9j/")) return "image/jpeg";
      if (head.startsWith("iVBORw0KGgo")) return "image/png";
      if (head.startsWith("R0lGOD")) return "image/gif";
      if (head.startsWith("UklGR")) return "image/webp";
      return "image/jpeg";
    };
    const mimeType = typeof mimeTypeInput === "string" && mimeTypeInput ? mimeTypeInput : detectMimeType(base64Data);

    const genAI = new GoogleGenerativeAI(apiKey);

    const getModelCandidates = () => {
      const envModel = process.env.GEMINI_MODEL;
      const base = [
        "gemini-flash-latest",
        "gemini-2.0-flash",
        "gemini-2.5-flash"
      ];
      return envModel ? [envModel, ...base.filter(m => m !== envModel)] : base;
    };

    const isModelNotFoundError = (err: any) => {
      const msg = String(err?.message || err);
      return msg.includes("404") && msg.toLowerCase().includes("models/");
    };

    const prompt = [
      "あなたは遺失物管理の業務補助AIです。",
      "画像から拾得物を分析し、JSON形式のみで回答してください。説明文やMarkdownやコードフェンスは不要です。",
      "必ず次のキーを含めてください: product_name, item_type, description, category_hint",
      "フォーマット例: {\"product_name\":\"品名\",\"item_type\":\"小分類\",\"description\":\"30文字程度\",\"category_hint\":\"大分類 / 中分類 / 小分類\"}"
    ].join("\n");

    let lastError: any;
    let result: any;
    for (const modelName of getModelCandidates()) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType
            }
          }
        ])
        lastError = null
        break
      } catch (err: any) {
        lastError = err
        if (!isModelNotFoundError(err)) throw err
      }
    }

    if (!result) {
      throw lastError || new Error("利用可能なAIモデルが見つかりませんでした")
    }

    const response = await result.response;
    const responseText = response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AIの出力がJSONではありません", raw: responseText },
        { status: 422 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e: any) {
      return NextResponse.json(
        { error: "AIのJSON解析に失敗しました", raw: jsonMatch[0], detail: e?.message },
        { status: 422 }
      );
    }

    // 既存クライアントの互換性のため text も返す（詳細ページが data.text を前提にしている）
    return NextResponse.json({
      ...parsed,
      text: JSON.stringify(parsed),
      raw: responseText
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}