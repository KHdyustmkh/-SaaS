export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定", category_hint: "その他" };

  // 【2026.03 最新安定版】正式リリースされた v1 エンドポイントを使用
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
      console.error("API Error Detail:", result.error?.message);
      throw new Error(result.error?.message || `HTTP ${response.status}`);
    }

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("AIからの応答がありません");

    // JSON部分のみを抽出するロジック
    const jsonMatch = aiText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("AIがJSON形式で回答しませんでした");
    
    return JSON.parse(jsonMatch[0]);

  } catch (error: any) {
    console.warn("Vision API Error Catch:", error.message);
    // 失敗時にアプリを止めないためのフォールバック
    return { 
      product_name: "", 
      category_hint: "その他", 
      color: "", 
      description: `【自動判定エラー: ${error.message}】手動で入力してください。` 
    };
  }
}