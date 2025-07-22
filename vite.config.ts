import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  // Configuration du serveur de développement
  define: {
    // Forcer l'injection des variables d'environnement
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@pages': path.resolve(__dirname, './src/pages')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 24678
    },
    watch: {
      usePolling: false
    },
    cors: true,
    proxy: {
      '/realtime': {
        target: 'http://localhost:54321',
        ws: true,
        changeOrigin: true
      }
    }
  },
  plugins: [
    react({
      // Configuration de base de React
      jsxImportSource: 'react',
      babel: process.env.NODE_ENV === 'production' ? {
        plugins: ['babel-plugin-macros']
      } : undefined,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      // Désactivé en développement
      devOptions: {
        enabled: false,
        type: 'module',
        navigateFallback: undefined,
        suppressWarnings: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Popotte Association',
        short_name: 'Popotte',
        description: 'Application de commande de repas',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/xtjzuqyvyzkzchwtjpeo\.supabase\.co/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
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
})