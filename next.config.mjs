/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 좌하단 Next.js dev 인디케이터(N 아이콘) 숨김
  devIndicators: false,
}

export default nextConfig
