import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 警察提出用の4桁シリアル番号を生成（例: 令和8年-1234）
 */
const generatePoliceId = () => {
  const now = new Date();
  const year = now.getFullYear(); 
  const randomId = Math.floor(Math.random() * 9999) + 1;
  const formattedId = String(randomId).padStart(4, '0');
  // ユーザーの意図（令和表示）を100%反映
  return `令和${year - 2018}年-${formattedId}`;
};

/**
 * AI拾得物管理官（自己修復・属性抽出・警察ID搭載）
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキー未設定");

  let targetModel = "gemini-flash-latest";
  
  const getPayload = (modelName: string) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [
          { text: "あなたは施設遺失物センターの熟練管理官です。画像から拾得物を特定し、以下の形式で出力してください。1. 名前：物体名、2. カテゴリー：分類、3. 特徴：30文字以内で外観や状態を簡潔に。余計な挨拶は不要です。" },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }]
    }
  });

  try {
    let config = getPayload(targetModel);
    let response = await fetch(config.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.body) });

    // 自動修復（404時）
    if (response.status === 404) {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const listData = await listRes.json();
      const autoModel = listData.models?.find((m: any) => m.supportedGenerationMethods.includes("generateContent") && m.name.includes("flash"));
      if (autoModel) {
        config = getPayload(autoModel.name.split('/').pop());
        response = await fetch(config.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.body) });
      }
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "通信失敗");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const nameMatch = text.match(/名前[:：]\s*(.*)/);
    const categoryMatch = text.match(/カテゴリー[:：]\s*(.*)/);
    const featureMatch = text.match(/特徴[:：]\s*(.*)/);

    // 【重要】ここでIDを生成
    const police_id = generatePoliceId();

    // 全データを一つの塊にして戻す
    return {
      product_name: nameMatch ? nameMatch[1].trim() : "特定不能",
      category_hint: categoryMatch ? categoryMatch[1].trim() : "一般",
      description: featureMatch ? featureMatch[1].trim() : text.substring(0, 30),
      police_id: police_id // ←これが画面に届くべきデータ
    };

  } catch (e: any) {
    throw new Error(`分析失敗: ${e.message}`);
  }
}

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || "");
    reader.onerror = (e) => reject(e);
  });
};