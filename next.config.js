/** @type {import('next').NextConfig} */
const path = require('path');
module.exports = {
  output: process.env.NEXT_STANDALONE ? 'standalone' : undefined,
  poweredByHeader: false,
  webpack: (config) => { config.resolve.alias['@'] = path.resolve(__dirname); return config; },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'pdfkit'],
    // pdfkit loads its built-in font metrics dynamically, so tell the tracer to ship them.
    outputFileTracingIncludes: { '/api/orders/[token]/invoice': ['./node_modules/pdfkit/js/**/*'] },
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] }];
  },
};
