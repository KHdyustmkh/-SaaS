export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { product_name: "キー未設定" };

  // Tier 1 昇格後は、この「正式版(v1)パス」が最も安定します
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "画像の内容を日本語で解析し、製品名、カテゴリー、色、特徴を特定してください。JSON形式のみで出力してください。{\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }]
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "API接続エラー");

    const aiText = result.candidates[0].content.parts[0].text;
    const jsonMatch = aiText.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { product_name: "解析失敗" };

  } catch (error: any) {
    console.error("Critical Debug:", error.message);
    return { product_name: "", category_hint: "その他", description: `【要確認】${error.message}` };
  }
}