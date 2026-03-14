export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定" };

  // Tier 1 昇格済みの新プロジェクト専用：最も安定した正式版エンドポイント
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像の内容を日本語で解析し、製品名、カテゴリー、色、特徴を特定してください。回答は必ず以下のJSON形式のみで出力してください。余計な解説は一切不要です。 {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }]
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("API Error Detail:", result.error);
      throw new Error(result.error?.message || `HTTP ${response.status}`);
    }

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("AIからの応答が空です");

    // JSON形式のみを抽出
    const jsonMatch = aiText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("JSON形式の解析に失敗しました");
    
    return JSON.parse(jsonMatch[0]);

  } catch (error: any) {
    console.error("Vision API Final Catch:", error.message);
    return { 
      product_name: "", 
      category_hint: "その他", 
      color: "", 
      description: `【判定エラー: ${error.message}】手動で入力してください。` 
    };
  }
}