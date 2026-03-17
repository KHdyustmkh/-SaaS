import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// スタイリング用共通関数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * AI解析関数（安定版 v1 固定仕様）
 * 不安定な v1beta を完全に排除し、商用利用レベルの安定エンドポイントのみを使用
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。");

  // β版(v1beta)を捨て、安定版(v1)のFlashモデルを直接叩く
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [
        { text: "この画像に写っている拾得物の名前、カテゴリー、詳細な特徴を日本語で解析してください。回答には必ず『名前：〇〇』『カテゴリー：〇〇』という形式を含めてください。" },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return {
      product_name: text.match(/名前[:：]\s*(.*)/)?.[1] || "不明なアイテム",
      category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1] || "一般",
      description: text
    };
  } catch (e: any) {
    console.error("Analysis failed:", e.message);
    throw new Error(`AI解析エラー: ${e.message}`);
  }
}

/**
 * 画像をBase64に変換する共通関数
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