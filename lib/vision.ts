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

  // 修正箇所：提供終了した 1.5-flash から、現在稼働中の最新モデル「gemini-2.5-flash」へ変更
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "あなたは遺失物管理センターの専門鑑識官です。この画像から、持ち主が「自分のものだ」と特定できる個体識別情報を抽出してください。以下の形式のJSONでのみ回答してください。JSON以外の文章は一切含めないでください。形式: {\"product_name\": \"具体的な品名（例：SUNSPEL クルーネックTシャツなど）\", \"category_hint\": \"カテゴリー判定用のキーワード\", \"color\": \"主要な色\", \"description\": \"以下の4点を必ず含めること。1.ロゴやタグの正確な位置と内容 2.サイズ表記(見える場合) 3.使用感の程度(ヨレ、色あせ等) 4.【最重要】固有のダメージ(シミ、傷、ほつれ等。ない場合は『特筆すべきダメージなし』と明記)\"}" },
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