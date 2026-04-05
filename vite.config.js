import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'renderer',
  base: './',
  plugins: [
    vue(),
    UnoCSS(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: false
    }),
    Components({
      dts: false
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'renderer')
    }
  },
  build: {
    outDir: resolve(__dirname, 'renderer-dist'),
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: true,
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
