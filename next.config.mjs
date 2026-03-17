/** @type {import('next').NextConfig} */
const nextConfig = {
  // サーバーサイドで扱う画像データのサイズ上限を緩和し、AI解析を安定させます
  serverExternalPackages: ["@google/generative-ai"],
  experimental: {
    // サーバーレス関数のタイムアウトやメモリ制限によるエラーを防止する設定
  }
};

export default nextConfig;