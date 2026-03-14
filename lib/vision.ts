export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定" };

  // 【打ち消し策】v1 ではなく v1beta に戻し、モデル名を gemini-1.5-flash に固定
  // これにより「not found for API version v1」というエラーを完全に封じ込めます
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像から品名、カテゴリ、色、特徴を日本語で抽出し、JSON形式で返してください。形式: {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }]
      }),
    });

    const result = await response.json();

    // 404や429などのエラーが出た場合、詳細をコンソールに吐き出す（打ち消し確認用）
    if (!response.ok) {
      console.error("DEBUG: API Response Error ->", result.error);
      throw new Error(result.error?.message || "Unknown Error");
    }

    const aiText = result.candidates[0].content.parts[0].text;
    const jsonMatch = aiText.match(/\{.*\}/s);
    
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { product_name: "解析失敗" };

  } catch (error: any) {
    console.error("Critical Analysis Error:", error.message);
    return { 
      product_name: "", 
      category_hint: "その他", 
      description: `【要確認】${error.message}` 
    };
  }
}