import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 1. スタイリング用共通関数（一文字も欠落なし）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 2. AI解析関数（最新のアカウント・APIキーに適合した v1beta 固定仕様）
 * エラーログ を踏まえ、v1 ではなく v1beta を使用。
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。Vercelの環境変数を確認してください。");

  // v1での「Not Found」を回避するため、1.5 Flashが確実に存在する v1beta エンドポイントを使用
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

    const data = await response.json();

    if (!response.ok) {
      // エラーの詳細をそのままスロー
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 正規表現による抽出処理（一文字も不足なし）
    return {
      product_name: text.match(/名前[:：]\s*(.*)/)?.[1] || "不明なアイテム",
      category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1] || "一般",
      description: text
    };
  } catch (e: any) {
    throw new Error(`AI解析エラー: ${e.message}`);
  }
}

/**
 * 3. 画像をBase64に変換する共通関数（一文字も欠落なし）
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