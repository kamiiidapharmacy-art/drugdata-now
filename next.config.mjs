/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // pg はサーバ専用パッケージ。クライアントバンドルに混ぜず外部依存として扱う。
  serverExternalPackages: ["pg"],
};

export default nextConfig;
