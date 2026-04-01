<script setup lang="ts">
import { Zap } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'
import { Moon, Sun } from 'lucide-vue-next'

const themeStore = useThemeStore()
</script>

<template>
  <div class="min-h-screen bg-[var(--bg)] flex">
    <!-- Left panel (desktop only) -->
    <div class="hidden lg:flex lg:flex-col lg:w-2/5 xl:w-1/2 bg-[var(--primary)] relative overflow-hidden">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div class="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
      </div>

      <div class="relative z-10 flex flex-col h-full p-10">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Zap class="w-5 h-5 text-white" />
          </div>
          <span class="text-white font-bold text-lg tracking-tight">Control Tower</span>
        </div>

        <!-- Middle content -->
        <div class="flex-1 flex flex-col justify-center">
          <h2 class="text-4xl font-bold text-white leading-tight mb-4">
            Manage your<br />POS clients<br />effortlessly.
          </h2>
          <p class="text-white/70 text-base leading-relaxed max-w-xs">
            A powerful CRM/ERP dashboard for monitoring licenses, health, tickets, and more.
          </p>

          <!-- Feature list -->
          <ul class="mt-8 space-y-3">
            <li v-for="feature in ['Real-time health monitoring', 'Support ticket management', 'License & billing control']" :key="feature"
              class="flex items-center gap-2.5 text-white/80 text-sm">
              <div class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {{ feature }}
            </li>
          </ul>
        </div>

        <!-- Bottom -->
        <p class="text-white/40 text-xs">&copy; 2026 Control Tower. All rights reserved.</p>
      </div>
    </div>

    <!-- Right panel (form area) -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Theme toggle top right -->
      <div class="flex justify-end p-4">
        <button
          class="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
          @click="themeStore.toggle()"
        >
          <Moon v-if="themeStore.isDark" class="w-4 h-4" />
          <Sun v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- Form centered -->
      <div class="flex-1 flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-sm">
          <!-- Mobile logo -->
          <div class="flex items-center gap-2.5 mb-8 lg:hidden">
            <div class="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <Zap class="w-4 h-4 text-white" />
            </div>
            <span class="font-bold text-[var(--text)] text-base">Control Tower</span>
          </div>

          <RouterView />
        </div>
      </div>
    </div>
  </div>
</template>
