export async function analyzeImage(base64Image: string) {
  const apiKey = process.env.NEXT_PUBLIC_VISION_API_KEY;
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requestData = {
    requests: [
      {
        image: {
          content: base64Image,
        },
        features: [
          {
            type: "LABEL_DETECTION",
            maxResults: 1,
          },
        ],
        // ★追加：日本語での回答を優先させる設定
        imageContext: {
          languageHints: ["ja"],
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  const result = await response.json();
  
  if (result.responses && result.responses[0].labelAnnotations) {
    // 日本語のラベルを返します（例: "腕時計"）
    return result.responses[0].labelAnnotations[0].description;
  }
  
  return "判別不能";
}