import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 既存のUIコンポーネント（Shadcn UI等）が使用するユーティリティ
 * 構成を一切変更せず、そのまま保持します。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * AI判定機能に必要な関数
 * 既存のコードを削除せず、末尾に追加します。
 */
export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // ヘッダー部分を削除してデータのみを抽出
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};