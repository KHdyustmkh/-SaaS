export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    return { 
      product_name: "環境変数未設定", 
      category_hint: "", 
      color: "", 
      description: "APIキーが設定されていません。" 
    };
  }

  // ★修正箇所：404エラーを回避するため、モデル名の指定を "gemini-1.5-flash" に固定
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `あなたは遺失物管理センターの専門鑑識官です。この画像から警察提出用の物件情報を抽出してください。
以下の制約を厳守し、JSON形式でのみ回答してください。

1. product_name: 具体的な品名。
2. category_hint: カテゴリー判定用の単語1つ。
3. color: 主要な色。
4. description: 【最重要】警察システム登録用。全角30文字以内で、ロゴの位置、形状、目立つ傷、サイズのうち「最も個体特定に繋がる特徴」を1つだけ簡潔に記述すること。箇条書き禁止。

形式: {"product_name": "...", "category_hint": "...", "color": "...", "description": "..."}` },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const detailedError = result.error?.message || `Status: ${response.status}`;
      throw new Error(detailedError);
    }

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("AIからの応答が空です。");

    try {
      return JSON.parse(aiText);
    } catch (e) {
      const jsonMatch = aiText.match(/\{.*\}/s);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error("解析データがJSON形式ではありませんでした。");
    }

  } catch (error: any) {
    return { 
      product_name: "解析エラー", 
      category_hint: "その他", 
      color: "", 
      description: `【エラー詳細】${error.message}` 
    };
  }
}