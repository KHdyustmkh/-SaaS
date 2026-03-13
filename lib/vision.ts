export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("API Key が設定されていません。");
    return { product_name: "設定エラー", category_hint: "その他", color: "不明", description: "APIキー未設定" };
  }

  // 【修正】最も互換性が高いエンドポイント形式
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestData = {
    contents: [{
      parts: [
        { text: "この画像にある製品の名前（例：iPhone 15 Pro）と、カテゴリー、色、特徴を特定してください。回答は必ず以下のJSON形式のみで出力してください。 {" +
                "\"product_name\": \"製品名\"," +
                "\"category_hint\": \"カテゴリー\"," +
                "\"color\": \"色\"," +
                "\"description\": \"特徴\"" +
                "}" 
        },
        {
          inline_data: {
            mime_type: "image/jpeg",
            data: base64Image
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 500,
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.error("Gemini API Error:", errorDetail);
      throw new Error(`Status: ${response.status}`);
    }

    const result = await response.json();
    
    // APIから返ってきたテキストを抽出
    const aiText = result.candidates[0].content.parts[0].text;
    
    // JSON部分だけを抽出（念のための処理）
    const jsonStart = aiText.indexOf('{');
    const jsonEnd = aiText.lastIndexOf('}') + 1;
    const jsonString = aiText.substring(jsonStart, jsonEnd);
    
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("解析実行エラー:", error);
    return { 
      product_name: "判別不能", 
      category_hint: "その他", 
      color: "不明", 
      description: "AIとの通信に失敗しました。" 
    };
  }
}