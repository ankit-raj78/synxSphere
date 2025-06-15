/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  
  // Image optimization for CloudFront
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'production', // Disable optimization for S3/CloudFront
  },
  
  // Environment-specific configuration
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  webpack: (config, { isServer }) => {
    // Enhanced fallbacks for problematic modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
      child_process: false,
      worker_threads: false,
    };

    // Ignore problematic modules during client-side builds
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'cloudflare:sockets': false,
        'pg-native': false,
        'pg-cloudflare': false,
        '../services/shared/config/database': false,
      };
    }

    // Externalize problematic packages for server builds
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pg-native', 'pg-cloudflare');
    }

    // Ignore specific modules that cause issues
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^(pg-cloudflare|cloudflare:sockets)$/,
      })
    );

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['pg', 'pg-pool'],
    webpackBuildWorker: false, // Disable webpack build worker to avoid cloudflare socket issues
  },
}

module.exports = nextConfig
