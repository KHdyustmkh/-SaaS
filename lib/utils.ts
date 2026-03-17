import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CATEGORY_TREE } from "./categories";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API key not found");

  // 全ての小分類（種類）をリスト化し、AIに選択肢として与える
  const allTypes: string[] = [];
  Object.keys(CATEGORY_TREE).forEach(main => {
    Object.keys(CATEGORY_TREE[main]).forEach(sub => {
      allTypes.push(...CATEGORY_TREE[main][sub]);
    });
  });
  const typeListString = Array.from(new Set(allTypes)).join(", ");

  const payload = {
    contents: [{
      parts: [
        { text: `遺失物管理官として画像を分析せよ。
【ルール】「種類」は必ず以下のリストから最も適切なものを1つ選び、一字一句変えずに回答せよ。
リスト：(${typeListString})
【出力形式】
名前：物体名
種類：リスト内の単語
特徴：30文字以内` },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }]
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return {
    product_name: text.match(/名前[:：]\s*(.*)/)?.[1]?.trim() || "不明",
    item_type: text.match(/種類[:：]\s*(.*)/)?.[1]?.trim() || "その他",
    description: text.match(/特徴[:：]\s*(.*)/)?.[1]?.trim() || "",
    police_id: `令和${new Date().getFullYear() - 2018}年-${Math.floor(Math.random() * 9000 + 1000)}`
  };
}

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || "");
  });
};