import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 二度と止まらないためのAI解析関数
 * 1. Flashモデル(高速)を試行
 * 2. 失敗(404等)した場合、自動でProモデル(高機能)へ切り替え
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。環境変数を確認してください。");

  // 試行するエンドポイントの優先順位リスト
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

  // 順番にエンドポイントを叩く（防弾ループ）
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
      } else {
        const err = await response.json();
        lastError = err.error?.message || `Status: ${response.status}`;
        console.warn(`Endpoint failed: ${url}, trying next...`, lastError);
      }
    } catch (e: any) {
      lastError = e.message;
      console.error(`Fetch error on ${url}:`, e);
    }
  }

  // すべてのモデルが全滅した場合のみエラーを投げる
  throw new Error(`全AIモデルが応答しません。Google側の制限かAPIキーの不備です: ${lastError}`);
}

/**
 * 画像を文字データ(Base64)に変換する関数
 */
export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.