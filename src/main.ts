import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import { VueQueryPlugin, QueryClient, keepPreviousData } from '@tanstack/vue-query'
import router from '@/router'
import { i18n } from '@/i18n'
import { startProactiveTokenRefresh } from '@/services/api'
import App from '@/App.vue'
import '@/assets/main.css'
import 'primeicons/primeicons.css'
import Vue3Toastify from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import VueApexCharts from 'vue3-apexcharts'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      // Keep showing old data while re-fetching (prevents blank flashes)
      placeholderData: keepPreviousData,
      // Don't re-fetch just because user switched browser tabs
      refetchOnWindowFocus: false
    }
  }
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
app.use(pinia)
app.use(i18n)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: '.dark', cssLayer: false }
  }
})
app.use(ToastService)
app.use(ConfirmationService)
app.use(VueQueryPlugin, { queryClient })
app.use(Vue3Toastify, {
  autoClose: 4000,
  position: 'top-right',
  theme: 'auto',
  clearOnUrlChange: false,
  pauseOnHover: true
})
app.directive('tooltip', Tooltip)
app.component('VueApexCharts', VueApexCharts)

if (import.meta.env.DEV) {
  app.config.errorHandler = (err, instance, info) => {
    console.error('[Vue error]', info, err, instance)
  }
}

app.mount('#app')
startProactiveTokenRefresh()
