export async function analyzeImage(base64Image: string) {
  // 環境変数は既存の VISION_API_KEY を流用するか、GEMINI_API_KEY を設定してください
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_VISION_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestData = {
    contents: [
      {
        parts: [
          {
            text: `あなたは日本の遺失物管理の専門家です。
画像から「具体的な商品名」を特定し、以下のJSON形式で回答してください。

【回答ルール】
1. product_name: 可能な限り具体的な固有名詞（例: iPhone 15 Pro, ルイ・ヴィトン モノグラム長財布, ソニー WH-1000XM5）。型番などが不明な場合は詳細な名称。
2. category_hint: その品物に最も近い日本語の一般的な名称（例: スマートフォン, 財布, 腕時計）。
3. color: 主要な色。
4. description: 傷、ケースの有無、ロゴ、特徴的なデザインなどの詳細。

必ず純粋なJSONのみを返し、それ以外の説明文は一切含めないでください。`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: "application/json"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData),
  });

  const result = await response.json();
  
  try {
    const textResponse = result.candidates[0].content.parts[0].text;
    return JSON.parse(textResponse); 
  } catch (error) {
    console.error("AI解析失敗:", error);
    return { product_name: "判別不能", category_hint: "その他", color: "不明", description: "" };
  }
}