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
  return `令和${year - 2018}年-${String(randomId).padStart(4, '0')}`;
};

/**
 * AI拾得物管理官（分類一致率100%特化型）
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキー未設定");

  const getPayload = (modelName: string) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [
          { text: "あなたは遺失物管理官です。画像から拾得物を特定してください。\n\n【重要：カテゴリー回答ルール】\nシステム照合のため、カテゴリー欄には必ず以下の単語のいずれか「のみ」を記述してください。余計な説明や装飾は一切禁止です。\n\n該当候補：(現金, 有価証券, 貴金属, 宝石, 財布, かばん, 鍵, 時計, カメラ, 眼鏡, 携帯電話, パソコン, 電化製品, 衣類, 履物, 傘, 文具, スポーツ用品, 楽器, 玩具, 日用品, 磁気カード, 証明書)\n\n出力形式：\n1. 名前：物体名\n2. カテゴリー：上記から選んだ単語1つ\n3. 特徴：30文字以内" },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }]
    }
  });

  try {
    let response = await fetch(getPayload("gemini-flash-latest").url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getPayload("gemini-flash-latest").body) });

    if (response.status === 404) {
      const list = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)).json();
      const model = list.models?.find((m: any) => m.name.includes("flash"))?.name.split('/').pop();
      if (model) response = await fetch(getPayload(model).url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getPayload(model).body) });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return {
      product_name: text.match(/名前[:：]\s*(.*)/)?.[1]?.trim() || "特定不能",
      category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1]?.trim() || "",
      description: text.match(/特徴[:：]\s*(.*)/)?.[1]?.trim() || text.substring(0, 30),
      police_id: generatePoliceId()
    };
  } catch (e: any) { throw new Error(e.message); }
}

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || "");
    reader.onerror = (e) => reject(e);
  });
};