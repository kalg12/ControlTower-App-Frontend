<script setup lang="ts">
import Dialog from "primevue/dialog";
import Spinner from "./Spinner.vue";
import { X } from "lucide-vue-next";

interface Props {
  title: string;
  subtitle?: string;
  loading?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: "",
  loading: false,
  size: "md",
});

const visible = defineModel<boolean>("visible", { default: false });

const sizeClasses: Record<string, string> = {
  sm: "w-full max-w-sm",
  md: "w-full max-w-lg",
  lg: "w-full max-w-2xl",
  xl: "w-full max-w-4xl",
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :closable="false"
    modal
    :draggable="false"
    :class="sizeClasses[size]"
    :pt="{
      root: 'border-none',
      mask: 'backdrop-blur-sm',
      header: 'border-b border-[var(--border)] px-6 py-4',
      content: 'px-6 py-4',
      footer: 'border-t border-[var(--border)] px-6 py-4 bg-[var(--bg-subtle)] rounded-b-lg'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <div>
            <h2 class="text-base font-semibold text-[var(--text)]">{{ title }}</h2>
            <p v-if="subtitle" class="text-sm text-[var(--text-muted)] mt-0.5">{{ subtitle }}</p>
          </div>
          <Spinner v-if="loading" className="w-4 h-4 text-[var(--primary)]" />
        </div>
        <button
          class="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
          :disabled="loading"
          @click="visible = false"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>
