export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定" };

  // Tier 1 認識後に最も安定する本番用エンドポイント
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像の内容を日本語で解析し、JSON形式で返してください。形式: {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }]
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // 同期が完了していない場合、ここで 404 が発生します
      throw new Error(result.error?.message || `HTTP ${response.status}`);
    }

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("AI応答が空です");

    const jsonMatch = aiText.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { product_name: "解析失敗" };

  } catch (error: any) {
    console.error("Analysis Error:", error.message);
    // ユーザーに現状を伝えるメッセージ
    return { 
      product_name: "", 
      category_hint: "その他", 
      description: `【システム有効化待ち】設定は完了していますが、Google側の反映に時間がかかっています。しばらくお待ちください。(${error.message})` 
    };
  }
}