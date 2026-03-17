import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 調査兼解析関数：ListModelsをコンソールに出しつつ、ビルドエラーを防ぐ
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。");

  // 1. まずはエラーメッセージの指示通り「ListModels」を叩いてコンソールに出す
  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();
    console.log("--- 【重要】利用可能なモデルリスト ---");
    console.dir(listData.models);
    console.log("------------------------------------");
  } catch (e) {
    console.error("リスト取得失敗:", e);
  }

  // 2. ビルドエラーを回避するため、暫定的に 1.5-flash を v1beta で叩く（結果を返す）
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [
        { text: "この画像の内容を解析してください。回答には必ず『名前：〇〇』『カテゴリー：〇〇』を含めてください。" },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`AI判定失敗: ${data.error?.message || response.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  // page.tsx（画像31）が期待している形式で必ず返す
  return {
    product_name: text.match(/名前[:：]\s*(.*)/)?.[1] || "解析中...",
    category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1] || "未分類",
    description: text
  };
}

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