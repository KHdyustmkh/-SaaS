import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * AI解析関数
 * Flashで404が出る問題を回避するため、自動でProモデルも試す防弾仕様
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。");

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`
  ];

  const payload = {
    contents: [{
      parts: [
        { text: "この画像に写っている拾得物の名前、カテゴリー、詳細な特徴を日本語で解析してください。回答には必ず『名前：〇〇』『カテゴリー：〇〇』という形式を含めてください。" },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }]
  };

  let lastError = "";
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return {
          product_name: text.match(/名前[:：]\s*(.*)/)?.[1] || "不明なアイテム",
          category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1] || "一般",
          description: text
        };
      }
      const err = await response.json();
      lastError = err.error?.message || response.status.toString();
    } catch (e: any) {
      lastError = e.message;
    }
  }
  throw new Error(`AI判定失敗: ${lastError}`);
}

/**
 * 画像をBase64に変換
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