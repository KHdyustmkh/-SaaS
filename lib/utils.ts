import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 既存の関数（デザイン用）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 画像をAI(Gemini)で解析する関数
 */
export async function analyzeImage(base64Image: string) {
  // 環境変数からAPIキーを取得
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  
  // ★重要：利用可能な最新モデルに修正（エラー回避）
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = "この画像に写っている拾得物の名前、カテゴリー、詳細な特徴を日本語で解析してください。";

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
    
    // 解析結果を整理して返す（JSON形式を想定）
    return {
      product_name: text.match(/名前[:：]\s*(.*)/)?.[1] || "不明なアイテム",
      category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1] || "一般",
      description: text
    };
  } catch (error) {
    console.error("AI解析エラー:", error);
    throw new Error("AI判定に失敗しました。APIキーまたはモデルの設定を確認してください。");
  }
}

/**
 * 画像を文字データ(Base64)に変換する関数
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