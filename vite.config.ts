import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // Use '/' at domain root. For a subpath deploy (e.g. https://example.com/app/), set base: '/app/'
  // and deploy assets under that path so imports and router match.
  base: "/",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  build: {
    // apexcharts minified bundle is ~1.15 MB and already isolated in its own async chunk
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("apexcharts") || id.includes("vue3-apexcharts"))
            return "apexcharts";
          if (id.includes("chart.js") || id.includes("vue-chartjs"))
            return "charts";
          if (
            id.includes("primevue/datatable") ||
            id.includes("primevue/treetable") ||
            id.includes("primevue/virtualscroller")
          )
            return "primevue-data";
          if (
            id.includes("primevue/dialog") ||
            id.includes("primevue/drawer") ||
            id.includes("primevue/overlaypanel") ||
            id.includes("primevue/popover")
          )
            return "primevue-overlay";
          if (
            id.includes("primevue/editor") ||
            id.includes("primevue/datepicker") ||
            id.includes("primevue/select") ||
            id.includes("primevue/multiselect") ||
            id.includes("primevue/input") ||
            id.includes("primevue/textarea")
          )
            return "primevue-forms";
          if (
            id.includes("primevue") ||
            id.includes("@primevue") ||
            id.includes("primeicons")
          )
            return "primevue-core";
          if (id.includes("@tanstack")) return "tanstack-query";
          if (id.includes("vue-i18n")) return "vue-i18n";
          if (id.includes("vue-router")) return "vue-router";
          if (id.includes("lucide-vue-next")) return "lucide";
          if (id.includes("pinia")) return "pinia";
          if (id.includes("vee-validate") || id.includes("zod"))
            return "validation";
          if (id.includes("dayjs")) return "dayjs";
        },
      },
    },
  },
});
