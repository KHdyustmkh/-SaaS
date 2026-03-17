import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// セキュリティと安定性のため、AI判定ロジックは /api/analyze/route.ts に集約しました。
// ここに古い analyzeImage を残すと v1beta エラーの原因になるため削除します。

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || "");
  });
};