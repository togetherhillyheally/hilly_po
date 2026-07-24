/** @type {import('next').NextConfig} */
const nextConfig = {
  // dev 서버와 프로드 빌드가 같은 .next 를 공유하면 빌드/배포가 실행 중인
  // dev 서버 캐시를 깨뜨려 재시작해야 하므로 dev 는 .next-dev 로 분리
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
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
