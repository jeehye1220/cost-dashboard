/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 성능 최적화 설정
  compress: true,
  
  // 정적 파일 최적화
  poweredByHeader: false,
  
  // 이미지 최적화 (필요시)
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // 빌드 최적화
  swcMinify: true,
  
  // 헤더 설정 (캐싱)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/COST RAW/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig





















