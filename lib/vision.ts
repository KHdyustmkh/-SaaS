/**
 * lib/vision.ts
 * Google Gemini API (Generative Language API) 連携モジュール
 */

export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("【エラー】環境変数 NEXT_PUBLIC_GEMINI_API_KEY が未設定です。");
    return { product_name: "環境変数未設定" };
  }

  // AI Studioのキーと最も相性が良く、画像解析に最適化されたエンドポイント
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "この画像にあるものを解析し、以下のJSON形式のみで回答してください。JSON以外の文章（説明やMarkdownの枠など）は一切含めないでください。形式: {\"product_name\": \"品名\", \"category_hint\": \"カテゴリー\", \"color\": \"色\", \"description\": \"特徴\"}" },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }],
        // 安全制限を無効化し、解析の中断を防止
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // APIエラーメッセージを直接取得。これが「真の原因」を伝えます。
      const detailedError = result.error?.message || `Status: ${response.status}`;
      console.error("【Gemini API Error】:", detailedError);
      throw new Error(detailedError);
    }

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("AIからの応答が空です。");

    // JSONを安全にパース
    try {
      return JSON.parse(aiText);
    } catch (e) {
      const jsonMatch = aiText.match(/\{.*\}/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error("解析データがJSON形式ではありませんでした。");
    }

  } catch (error: any) {
    console.error("Critical AI Error:", error.message);
    // 画面の「説明欄」にエラー原因を直接表示させるための戻り値
    return { 
      product_name: "解析エラー", 
      category_hint: "その他", 
      color: "", 
      description: `【原因特定】${error.message}` 
    };
  }
}