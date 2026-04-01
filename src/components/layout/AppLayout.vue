<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import ConfirmDialog from 'primevue/confirmdialog'
import { useWebSocket } from '@/composables/useWebSocket'

const sidebarOpen = ref(false)

const { connect, disconnect } = useWebSocket()
onMounted(connect)
onUnmounted(disconnect)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[var(--bg)]">
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
        'fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] transform transition-transform duration-200 lg:relative lg:translate-x-0 lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <AppSidebar @close="closeSidebar" />
    </div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <AppHeader @toggle-sidebar="toggleSidebar" />

      <main class="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-subtle)]">
        <RouterView />
      </main>
    </div>
  </div>
  <ConfirmDialog />
</template>
