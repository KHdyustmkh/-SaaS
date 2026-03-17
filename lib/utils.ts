import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. スタイリング用の共通関数（変更なし）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 画像をAI(Gemini)で解析する関数
 * 昨日まで動いていた構成を維持し、モデル名のエラーのみを修正
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("APIキーが設定されていません。環境変数を確認してください。");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // ★重要：SDK（getGenerativeModel）を使用する場合、"models/" は不要です。
  // ここを "gemini-1.5-flash" にすることで 404 エラーを解消します。
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = "この画像に写っている拾得物の名前、カテゴリー、詳細な特徴を日本語で解析してください。回答には必ず『名前：〇〇』『カテゴリー：〇〇』という形式を含めてください。";

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);
    const response = await result.response;
    const text = response.text();
    
    return {
      product_name: text.match(/名前[:：]\s*(.*)/)?.[1] || "不明なアイテム",
      category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1] || "一般",
      description: text
    };
  } catch (error: any) {
    console.error("AI解析エラー:", error);
    throw new Error(`AI判定失敗: ${error.message}`);
  }
}

/**
 * 画像を文字データ(Base64)に変換する関数（変更なし）
 */
export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result?.toString().split(',')[1];
      resolve(base64String || "");
    };
    reader.onerror = (error) => reject(error);
  });
};