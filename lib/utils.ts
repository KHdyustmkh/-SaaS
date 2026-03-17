import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 拾得物管理システム：自己修復型AIエージェント
 * 特徴：接続エラー時に「使えるモデル」を自動探索し、自己解決する
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("APIキー未設定");

  // 1. 最初のアタック（今の正解を試す）
  let targetModel = "gemini-flash-latest";
  
  const getPayload = (modelName: string) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [
          { text: "あなたは施設遺失物センターの熟練管理官です。画像から拾得物を特定し、1. 名前：、2. カテゴリー：、3. 特徴：(30文字以内) の形式で出力してください。" },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }]
    }
  });

  try {
    let config = getPayload(targetModel);
    let response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config.body)
    });

    // 2. もし404エラー（モデル不在）が出たら「自動探索」モードへ
    if (response.status === 404) {
      console.warn("モデルが見つかりません。自動探索を開始します...");
      
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const listRes = await fetch(listUrl);
      const listData = await listRes.json();
      
      // リストの中から「generateContent」が使えて、かつ「flash」という名前を含むものを自動抽出
      const autoModel = listData.models?.find((m: any) => 
        m.supportedGenerationMethods.includes("generateContent") && 
        m.name.includes("flash")
      );

      if (autoModel) {
        const newModelName = autoModel.name.split('/').pop();
        console.log(`新モデル発見: ${newModelName}。再試行します。`);
        config = getPayload(newModelName);
        response = await fetch(config.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config.body)
        });
      }
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "通信失敗");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return {
      product_name: text.match(/名前[:：]\s*(.*)/)?.[1] || "特定不能",
      category_hint: text.match(/カテゴリー[:：]\s*(.*)/)?.[1] || "一般",
      description: text.match(/特徴[:：]\s*(.*)/)?.[1] || text
    };

  } catch (e: any) {
    throw new Error(`システム自動修復失敗: ${e.message}`);
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