export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_VISION_API_KEY;
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requestData = {
    requests: [
      {
        image: { content: base64Image },
        features: [
          // localizedObjectAnnotations は「腕時計」などの日本語を直接返しやすいため変更
          { type: "OBJECT_LOCALIZATION", maxResults: 1 },
          // 予備としてラベル検出も残すが、日本語ヒントを強化
          { type: "LABEL_DETECTION", maxResults: 1 }
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData),
  });

  const result = await response.json();
  const res = result.responses[0];

  // 1. まず「オブジェクト検知」から日本語名を試みる
  if (res.localizedObjectAnnotations && res.localizedObjectAnnotations.length > 0) {
    return res.localizedObjectAnnotations[0].name;
  }

  // 2. 1がダメなら「ラベル検出」から取得する
  if (res.labelAnnotations && res.labelAnnotations.length > 0) {
    return res.labelAnnotations[0].description;
  }
  
  return "判別不能";
}