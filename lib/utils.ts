import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 1. スタイリング用共通関数（変更なし）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 画像をAI(Gemini)で解析する関数
 * ライブラリを使わず、安定版(v1) APIを直接叩く方式に切り替え
 * これにより 404 エラーを物理的に解消します。
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。");

  // 安定版(v1)のエンドポイントを直接指定
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
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "APIリクエスト失敗");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
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