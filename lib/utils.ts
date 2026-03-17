import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const generatePoliceId = () => {
  const now = new Date();
  const year = now.getFullYear(); 
  const randomId = Math.floor(Math.random() * 9999) + 1;
  const formattedId = String(randomId).padStart(4, '0');
  return `令和${year - 2018}年-${formattedId}`;
};

export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキー未設定");

  const targetModel = "gemini-flash-latest";
  
  const getPayload = (modelName: string) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [
          { text: "あなたは施設遺失物センターの管理官です。画像から拾得物を特定してください。\n\n【重要：カテゴリー回答ルール】\n以下の単語リストから、画像に最も近いものを1つだけ選び「カテゴリー」として回答してください。これ以外の言葉は絶対に使わないでください：\n(現金, 有価証券, 貴金属, 宝石, 財布, かばん・袋物, 鍵, 時計, カメラ, 眼鏡, 携帯電話, パソコン, 電化製品, 衣類, 履物, 傘, 書籍・文具, スポーツ用品, 楽器, 玩具, 日用品・雑貨, 磁気カード, 証明書)\n\n出力形式：\n1. 名前：物体名\n2. カテゴリー：上記リストから選んだ単語\n3. 特徴：30文字以内で簡潔に" },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }]
    }
  });

  try {
    let config = getPayload(targetModel);
    let response = await fetch(config.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.body) });

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

    return {
      product_name: nameMatch ? nameMatch[1].trim() : "特定不能",
      category_hint: categoryMatch ? categoryMatch[1].trim() : "一般",
      description: featureMatch ? featureMatch[1].trim() : text.substring(0, 30),
      police_id: generatePoliceId()
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