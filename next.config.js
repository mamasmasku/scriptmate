/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Izinkan domain eksternal untuk image jika diperlukan
  images: {
    domains: [],
  },

  // Headers untuk iframe support di Blogger
  async headers() {
    return [
      {
        // Halaman utama boleh di-embed di iframe
        source: '/',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *;",
          },
        ],
      },
      {
        // Halaman auth TIDAK boleh di-embed (buka di tab baru)
        source: '/auth/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
      {
        // Admin panel TIDAK boleh di-embed
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
