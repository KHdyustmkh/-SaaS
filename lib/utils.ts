import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 【調査用】ListModelsを実行し、コンソールに利用可能モデルを表示する関数
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません。");

  // エラーメッセージの指示通り、利用可能なモデル一覧を取得するURL
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // ブラウザのコンソール（F12）に全リストを出力
    console.log("--- 利用可能なモデル一覧 ---");
    console.log(data);
    console.log("---------------------------");

    if (data.models) {
      const modelNames = data.models.map((m: any) => m.name).join("\n");
      throw new Error(`利用可能モデル一覧をコンソールに出力しました。取得できた名前の一部:\n${modelNames}`);
    }
    
    throw new Error("モデルリストの取得に失敗しました。");
  } catch (e: any) {
    throw new Error(`調査失敗: ${e.message}`);
  }
}

// 既存の関数は消さずに保持（エラー回避のため）
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