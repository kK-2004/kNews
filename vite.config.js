import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import UnoCSS from 'unocss/vite'
import createNitro from 'vite-plugin-with-nitro'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: false
    }),
    Components({
      dts: false
    }),
    createNitro({
      renderer: './server/renderer.js',
      experimental: {
        database: true
      },
      database: {
        default: {
          connector: 'better-sqlite3'
        }
      },
      devDatabase: {
        default: {
          connector: 'better-sqlite3'
        }
      },
      imports: {
        dirs: ['server/utils']
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  ssr: {
    noExternal: ['vue', 'vue-router', 'pinia']
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    ssrManifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          motion: ['@vueuse/motion'],
          animate: ['@formkit/auto-animate']
        }
      }
    }
  }
})
