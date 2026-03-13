export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("API Key が設定されていません。");
    return { product_name: "設定エラー", category_hint: "その他", color: "不明", description: "APIキーが未設定です" };
  }

  // URLを修正しました (v1beta -> v1)
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestData = {
    contents: [
      {
        parts: [
          {
            text: `あなたは遺失物管理のプロです。画像から具体的な商品名（iPhone 10、ルイ・ヴィトン等）を特定し、必ず以下のJSON形式のみで回答してください。
{
  "product_name": "具体的な商品名",
  "category_hint": "カテゴリー名",
  "color": "色",
  "description": "特徴"
}`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      // ここでエラー内容を詳しくログに出すようにします
      const errorText = await response.text();
      console.error("API Response Error:", errorText);
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    const textResponse = result.candidates[0].content.parts[0].text;
    
    // AIがJSON以外の文字を混ぜた場合の救済策
    const jsonMatch = textResponse.match(/\{.*\}/s);
    const jsonString = jsonMatch ? jsonMatch[0] : textResponse;
    
    return JSON.parse(jsonString);
    
  } catch (error) {
    console.error("解析エラー:", error);
    return { 
      product_name: "判別不能", 
      category_hint: "その他", 
      color: "不明", 
      description: "通信エラーが発生しました。" 
    };
  }
}