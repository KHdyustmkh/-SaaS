/**
 * Google Gemini API (Generative Language API) を使用して画像を解析するモジュール
 * * 修正点:
 * 1. エンドポイントを v1 から v1beta へ変更（互換性向上）
 * 2. responseMimeType: "application/json" を追加（解析失敗を防止）
 * 3. エラーハンドリングを強化し、詳細な原因をログ出力
 */

export async function analyzeImage(base64Image: string) {
  // Vercelの環境変数からAPIキーを取得
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("【エラー】環境変数 NEXT_PUBLIC_GEMINI_API_KEY が設定されていません。");
    return { 
      product_name: "キー未設定", 
      category_hint: "", 
      color: "", 
      description: "環境変数を確認してください。" 
    };
  }

  // Google Cloud Console (画像67) の有効化状況に合わせた最適エンドポイント
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { 
              text: "画像の内容を日本語で解析し、指定されたJSON形式で回答してください。JSON以外の文章は一切含めないでください。形式: {\"product_name\": \"\", \"category_hint\": \"\", \"color\": \"\", \"description\": \"\"}" 
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
          // AIにJSON形式で出力させるための強制フラグ
          responseMimeType: "application/json",
          temperature: 0.4,
          topP: 1,
          maxOutputTokens: 1000
        }
      }),
    });

    const result = await response.json();

    // HTTPエラー（400, 403, 429など）の処理
    if (!response.ok) {
      const errorMsg = result.error?.message || `HTTP ${response.status}`;
      console.error("【Gemini APIエラー】:", errorMsg);
      throw new Error(errorMsg);
    }

    // AIの回答テキストを取得
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      throw new Error("AIからの応答内容が空です。");
    }

    // JSONとしてパース
    try {
      return JSON.parse(aiText);
    } catch (parseError) {
      // 万が一JSON以外の文字が混ざった場合の予備処理
      console.warn("【パース警告】JSONの直接パースに失敗しました。抽出を試みます。");
      const jsonMatch = aiText.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("有効なJSON形式のデータが得られませんでした。");
    }

  } catch (error: any) {
    // 開発者ツール（Console）で詳細なエラーを確認できるようにする
    console.error("【解析プロセス失敗】:", error);
    
    return { 
      product_name: "解析エラー", 
      category_hint: "その他", 
      color: "", 
      description: `解析に失敗しました。(${error.message})` 
    };
  }
}