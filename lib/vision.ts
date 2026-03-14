export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    return { product_name: "キー未設定", category_hint: "その他", color: "不明", description: "Vercelの設定を確認してください" };
  }

  // 【最重要修正】v1beta を使い、モデル名を最新の指定形式に変更
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像の内容を日本語で解析し、製品名、カテゴリー、色、特徴を以下のJSON形式でのみ出力してください。 {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }]
      }),
    });

    const result = await response.json();

    if (result.error) {
      console.error("Gemini Error Detail:", result.error);
      throw new Error(result.error.message);
    }

    const aiText = result.candidates[0].content.parts[0].text;
    const cleanJson = aiText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("Critical Error:", error);
    return { 
      product_name: "判別不能", 
      category_hint: "その他", 
      color: "不明", 
      description: `エラー: ${error.message}` 
    };
  }
}