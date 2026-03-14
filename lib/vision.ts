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

  // 修正箇所：モデル名を「gemini-1.5-flash-latest」と明示的に指定
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "この画像にあるものを解析し、以下のJSON形式のみで回答してください。JSON以外の文章は一切含めないでください。形式: {\"product_name\": \"品名\", \"category_hint\": \"カテゴリー\", \"color\": \"色\", \"description\": \"特徴\"}" },
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