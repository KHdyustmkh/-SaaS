/**
 * 【デバッグ用】Gemini 1.5 Flash 解析エンジン
 * どこでエラーが起きているかをブラウザのコンソール（F12）に詳しく出力します。
 */
export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  // --- デバッグログ開始 ---
  console.log("--- AI解析デバッグ開始 ---");
  console.log("1. APIキーの存在確認:", !!apiKey ? "⭕️ あり" : "❌ なし (環境変数が読み込めていません)");
  
  if (apiKey) {
    console.log("2. APIキーの冒頭5文字:", apiKey.substring(0, 5));
  }
  // --- デバッグログ終了 ---

  if (!apiKey) {
    return { 
      product_name: "キー設定エラー", 
      category_hint: "その他", 
      color: "不明", 
      description: "VercelのEnvironment Variablesに NEXT_PUBLIC_GEMINI_API_KEY が設定されているか確認してください。" 
    };
  }

  // エンドポイント設定
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像にある製品の具体的名称、カテゴリー、色、特徴を特定し、必ず以下のJSON形式のみで回答してください。返信にJSON以外の文字を含めないでください。 {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      }),
    });

    console.log("3. APIレスポンスステータス:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("4. APIエラー詳細:", errorText);
      throw new Error(`APIエラー: ${response.status}`);
    }

    const result = await response.json();
    console.log("5. APIから返ってきた生のデータ:", result);

    const aiText = result.candidates[0].content.parts[0].text;
    return JSON.parse(aiText);

  } catch (error: any) {
    console.error("❌ 致命的エラー:", error);
    return { 
      product_name: "判別不能", 
      category_hint: "その他", 
      color: "不明", 
      description: `原因: ${error.message}` 
    };
  }
}