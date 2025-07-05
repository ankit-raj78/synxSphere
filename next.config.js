/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  
  // TypeScript build configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Exclude CDK and other non-Next.js directories
  experimental: {
    externalDir: true,
  },
  
  // Image optimization for CloudFront
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'production', // Disable optimization for S3/CloudFront
  },
  
  // Environment-specific configuration
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },

  // Runtime configuration for environment variables
  serverRuntimeConfig: {
    // Will only be available on the server side
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  
  publicRuntimeConfig: {
    // Will be available on both server and client
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
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
        source: '/api/studio-assets',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/studio-assets/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/studio/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
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
      {
        source: '/((?!api).*)*',
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
