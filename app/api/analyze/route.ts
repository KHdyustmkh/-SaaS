import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 【診断】利用可能なモデルをリストアップする
    // これが404になる場合、APIキー自体がこのSDKで使えない種類（Vertex AI用など）です
    // @ts-ignore
    const modelList = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
    
    // モデル名を明示的に最新版に指定してみる
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // 疎通確認のための最小構成
    const result = await model.generateContent("ping");
    const response = await result.response;
    
    return NextResponse.json({ 
      status: "success", 
      message: "API接続成功",
      response: response.text()
    });

  } catch (error: any) {
    console.error("Diagnostic Error:", error);
    return NextResponse.json({ 
      status: "error", 
      message: error.message,
      stack: error.stack,
      // APIのURLを隠さずに出力して確認
      endpoint: error.endpoint || "unknown"
    }, { status: 500 });
  }
}