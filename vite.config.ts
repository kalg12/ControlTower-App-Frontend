import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // Use '/' at domain root. For a subpath deploy (e.g. https://example.com/app/), set base: '/app/'
  // and deploy assets under that path so imports and router match.
  base: '/',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true }
    }
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) return 'apexcharts'
          if (id.includes('primevue') || id.includes('@primevue')) return 'primevue'
          if (id.includes('@tanstack')) return 'tanstack-query'
          if (id.includes('vue-i18n')) return 'vue-i18n'
          if (id.includes('vue-router')) return 'vue-router'
          if (id.includes('lucide-vue-next')) return 'lucide'
        }
      }
    }
  }
})
