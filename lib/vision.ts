export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定", category_hint: "その他", color: "不明", description: "設定エラー" };

  // 【最重要】Googleが確実に認識する「最新のエイリアス」に変更
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

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

    // 404エラーが出た場合のデバッグログ
    if (result.error) {
      console.error("Google API Error Detail:", result.error.message);
      throw new Error(result.error.message);
    }

    const aiText = result.candidates[0].content.parts[0].text;
    const jsonMatch = aiText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("Invalid JSON response from AI");
    
    return JSON.parse(jsonMatch[0]);

  } catch (error: any) {
    return { product_name: "判別不能", category_hint: "その他", color: "不明", description: `原因: ${error.message}` };
  }
}