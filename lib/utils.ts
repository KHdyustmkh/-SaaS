import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 既存の関数（デザイン用）：これはそのまま残します
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 追加分：画像をAIが読める文字データ(Base64)に変換する関数
 */
export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // ファイルを読み込み開始
    reader.readAsDataURL(file);
    
    // 読み込みが終わったときの処理
    reader.onload = () => {
      // データの先頭についている余計な文字を消して、純粋なデータだけを取り出す
      const base64String = reader.result?.toString().split(',')[1];
      resolve(base64String || "");
    };
    
    // エラーが起きたときの処理
    reader.onerror = (error) => reject(error);
  });
};