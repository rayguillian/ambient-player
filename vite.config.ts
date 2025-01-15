import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Ambient Player",
        short_name: "Ambient",
        description: "A relaxing ambient sound player",
        theme_color: "#000000",
        icons: [
          {
            src: "vite.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'audio-cache',
              expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/storage': {
        target: 'https://firebasestorage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Remove origin header to prevent CORS issues
            proxyReq.removeHeader('origin');
            
            // Forward range headers for audio streaming
            if (req.headers.range) {
              proxyReq.setHeader('Range', req.headers.range);
            }

            // Set accept header
            proxyReq.setHeader('Accept', '*/*');
          });

          proxy.on('proxyRes', (proxyRes, _req, res) => {
            // Ensure CORS headers are set
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Range, Accept';
            proxyRes.headers['Access-Control-Expose-Headers'] = 'Content-Range, Content-Length, Content-Type, Accept-Ranges';

            // Ensure content type is forwarded
            if (proxyRes.headers['content-type']) {
              res.setHeader('Content-Type', proxyRes.headers['content-type']);
            }

            // Forward range-related headers
            if (proxyRes.headers['content-range']) {
              res.setHeader('Content-Range', proxyRes.headers['content-range']);
            }
            if (proxyRes.headers['accept-ranges']) {
              res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
            }
            if (proxyRes.headers['content-length']) {
              res.setHeader('Content-Length', proxyRes.headers['content-length']);
            }
          });
        }
      }
    }
  }
})
