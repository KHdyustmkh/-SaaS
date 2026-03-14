export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定", category_hint: "その他", color: "不明", description: "設定エラー" };

  // 2026年時点の最新安定モデル gemini-2.0-flash を使用
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
      throw new Error(result.error?.message || `HTTP ${response.status}`);
    }

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("Empty response from AI");

    const jsonMatch = aiText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("Invalid JSON format");
    
    return JSON.parse(jsonMatch[0]);

  } catch (error: any) {
    console.warn("Vision API Error:", error.message);
    // 解析に失敗しても入力を止めないためのフォールバック
    return { 
      product_name: "", 
      category_hint: "その他", 
      color: "", 
      description: "【自動解析に失敗しました。お手数ですが手動で入力してください】" 
    };
  }
}