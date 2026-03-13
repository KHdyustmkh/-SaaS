// Google Vision APIを呼び出す関数
export const analyzeImage = async (base64Image: string) => {
  // .env.localに保存したAPIキーを読み込みます
  const apiKey = process.env.NEXT_PUBLIC_VISION_API_KEY;
  
  if (!apiKey) {
    throw new Error("APIキーが設定されていません。.env.localを確認してください。");
  }

  // GoogleのAIサービスの住所
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  // AIに「この写真に何が写っているか教えて」とリクエストを送る
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Image }, // 画像データ
          features: [
            { type: 'LABEL_DETECTION', maxResults: 5 }, // 「ラベル（名前）」を最大5つ
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  
  // AIが答えた中で一番「これだ！」と思う名前を1つだけ返します
  // 何もわからなかったら「不明なアイテム」と返します
  return data.responses[0]?.labelAnnotations[0]?.description || "不明なアイテム";
};