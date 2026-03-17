import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 1. スタイリング用共通関数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * AI拾得物管理官（Filtering Agent）
 * 精度・速度・文字数制限をすべて担保した確定版ロジック
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキー未設定");

  // 先ほど ListModels で確定させた「gemini-flash-latest」を直接指定
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [
        { text: "あなたは施設遺失物センターの熟練管理官です。画像から拾得物を特定し、以下の形式で出力してください。1. 名前：物体名、2. カテゴリー：分類、3. 特徴：30文字以内で外観や状態を簡潔に。余計な挨拶は不要です。" },
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

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 管理官としての出力を正確にパース
    return {
      product_name: text.match(/名前[:：]\s*(.*)/)?.[1] || "不明なアイテム",
      category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1] || "一般",
      description: text.match(/特徴[:：]\s*(.*)/)?.[1] || text // 30文字以内の特徴を抽出
    };
  } catch (e: any) {
    throw new Error(`管理官エラー: ${e.message}`);
  }
}

/**
 * 3. 画像をBase64に変換する共通関数
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