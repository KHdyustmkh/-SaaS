export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    return { product_name: "キー未設定", category_hint: "その他", color: "不明", description: "設定を確認してください" };
  }

  // 【修正ポイント】v1betaからv1へ変更し、モデル名の指定を確実なものに
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestData = {
    contents: [{
      parts: [
        { text: "画像の内容を日本語で解析し、製品名（iPhoneのモデル名等）、カテゴリー、色、特徴を以下のJSON形式でのみ返してください。 {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    // エラーがある場合は詳細を出す
    if (result.error) {
      console.error("Gemini API Error Detail:", result.error);
      throw new Error(result.error.message);
    }

    const aiText = result.candidates[0].content.parts[0].text;
    const cleanJson = aiText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("Critical Error:", error);
    // モデルが見つからないと言われた場合の予備（gemini-pro-visionへの切り替え）
    return { product_name: "判別不能", category_hint: "その他", color: "不明", description: "エラー: " + error.message };
  }
}