<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import CommandPalette from '@/components/search/CommandPalette.vue'
import ConfirmDialog from 'primevue/confirmdialog'
import { useWebSocket } from '@/composables/useWebSocket'

const route = useRoute()
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const commandPaletteOpen = ref(false)

const { connect, disconnect } = useWebSocket()
onMounted(connect)
onUnmounted(disconnect)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    commandPaletteOpen.value = !commandPaletteOpen.value
  }
}

onMounted(() => document.addEventListener('keydown', handleGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleGlobalKeydown))
</script>

<template>
  <div class="flex h-screen min-h-0 overflow-hidden bg-[var(--bg)]">
    <!-- Mobile sidebar overlay -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/50 lg:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <!-- Sidebar (desktop: fixed, mobile: overlay) -->
    <div
      :class="[
        'fixed inset-y-0 left-0 z-50 min-h-0 transform transition-all duration-200 lg:relative lg:translate-x-0 lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        sidebarCollapsed ? 'w-14' : 'w-[var(--sidebar-width)]'
      ]"
    >
      <AppSidebar :collapsed="sidebarCollapsed" @close="closeSidebar" />
    </div>

    <!-- Main content -->
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <AppHeader @toggle-sidebar="toggleSidebar" @toggle-collapse="sidebarCollapsed = !sidebarCollapsed" @open-search="commandPaletteOpen = true" />

      <main class="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-subtle)]">
        <RouterView :key="route.path" />
      </main>
    </div>
  </div>
  <ConfirmDialog />
  <CommandPalette v-model:open="commandPaletteOpen" />
</template>
