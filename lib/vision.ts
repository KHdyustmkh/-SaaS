export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定", category_hint: "その他", color: "不明", description: "設定エラー" };

  // 【最重要】モデル名を 2.0 から 2.5 (安定版) または 3-flash-preview に変更
  // ここを gemini-2.5-flash にすることで、404エラーを物理的に回避します
  const modelId = "gemini-2.5-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像の内容を日本語で解析し、製品名、カテゴリー、色、特徴を特定してください。回答は必ず以下のJSON形式のみで出力してください。 {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }]
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      // ログに詳細を出し、何が起きているか可視化する
      console.error("Gemini API Error details:", result.error);
      throw new Error(result.error?.message || `HTTP ${response.status}`);
    }

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("Empty response");

    const jsonMatch = aiText.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { product_name: "解析失敗", category_hint: "その他" };

  } catch (error: any) {
    console.warn("Vision API Error:", error.message);
    return { 
      product_name: "", 
      category_hint: "その他", 
      color: "", 
      description: `【エラー: ${error.message}】手動入力をお願いします。` 
    };
  }
}