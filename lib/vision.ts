export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定", category_hint: "その他", color: "不明", description: "設定エラー" };

  // --- 手法1: 最先端モデル (Gemini 1.5 Flash) ---
  const urlFlash = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // --- 手法2: 安定版モデル (Gemini 1.0 Pro Vision) ---
  const urlPro = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      parts: [
        { text: "画像の内容を日本語で解析し、製品名、カテゴリー、色、特徴を特定してください。回答は必ず以下のJSON形式のみで出力してください。 {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }]
  };

  try {
    // まず Flash で試す
    let response = await fetch(urlFlash, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    let result = await response.json();

    // Flashが 404 等で失敗した場合は、即座に Pro モデルへ切り替える（これが救済策です）
    if (result.error) {
      console.warn("Flash model failed, switching to Pro Vision...");
      response = await fetch(urlPro, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      result = await response.json();
    }

    if (result.error) throw new Error(result.error.message);

    const aiText = result.candidates[0].content.parts[0].text;
    const jsonStart = aiText.indexOf('{');
    const jsonEnd = aiText.lastIndexOf('}') + 1;
    return JSON.parse(aiText.substring(jsonStart, jsonEnd));

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return { product_name: "判別不能", category_hint: "その他", color: "不明", description: `原因: ${error.message}` };
  }
}