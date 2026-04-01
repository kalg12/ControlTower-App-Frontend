import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import router from '@/router'
import App from '@/App.vue'
import '@/assets/main.css'
import 'primeicons/primeicons.css'
import { Toaster } from 'vue-sonner'
import VueApexCharts from 'vue3-apexcharts'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } }
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
app.use(pinia)
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
app.component('Toaster', Toaster)
app.component('VueApexCharts', VueApexCharts)
app.mount('#app')
