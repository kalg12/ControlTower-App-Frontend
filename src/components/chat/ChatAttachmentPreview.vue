<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import api from '@/services/api'

const props = defineProps<{ attachmentUrl: string; label: string }>()
const objectUrl = ref('')
const mimeType = ref('')
const failed = ref(false)
const viewerOpen = ref(false)
const isImage = computed(() => mimeType.value.startsWith('image/'))

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  try {
    const path = props.attachmentUrl.replace(/^\/api\/v1/, '')
    const response = await api.get<Blob>(path, { responseType: 'blob' })
    mimeType.value = response.data.type
    objectUrl.value = URL.createObjectURL(response.data)
  } catch {
    failed.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

function openAttachment() {
  if (objectUrl.value) viewerOpen.value = true
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') viewerOpen.value = false
}
</script>

<template>
  <div class="attachment-preview">
    <div v-if="!objectUrl && !failed" class="attachment-loading">
      <i class="pi pi-spin pi-spinner" /> Cargando adjunto…
    </div>
    <button v-else-if="objectUrl && isImage" type="button" class="attachment-image" @click="openAttachment">
      <img :src="objectUrl" :alt="label" />
      <span><i class="pi pi-search-plus" /> Ver captura</span>
    </button>
    <a v-else-if="objectUrl" :href="objectUrl" target="_blank" rel="noopener noreferrer" class="attachment-file">
      <i class="pi pi-paperclip" /> {{ label }}
    </a>
    <span v-else class="attachment-error"><i class="pi pi-exclamation-circle" /> No se pudo cargar el adjunto</span>

    <Teleport to="body">
      <div v-if="viewerOpen && objectUrl" class="attachment-viewer" role="dialog" aria-modal="true" aria-label="Vista previa de la captura" @click.self="viewerOpen = false">
        <header>
          <div>
            <strong>Captura enviada desde POS</strong>
            <small>{{ label.replace('📷 ', '').replace('📎 ', '') }}</small>
          </div>
          <div class="attachment-viewer-actions">
            <a :href="objectUrl" :download="label.replace('📷 ', '').replace('📎 ', '')" title="Descargar captura"><i class="pi pi-download" /> Descargar</a>
            <button type="button" title="Cerrar vista previa" aria-label="Cerrar vista previa" @click="viewerOpen = false"><i class="pi pi-times" /></button>
          </div>
        </header>
        <main><img :src="objectUrl" :alt="label" /></main>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.attachment-preview { width: min(28rem, 100%); }
.attachment-loading, .attachment-error, .attachment-file { display: flex; align-items: center; gap: .35rem; padding: .6rem .75rem; font-size: .7rem; }
.attachment-error { color: #ef4444; }
.attachment-file { color: var(--primary); text-decoration: underline; }
.attachment-image { position: relative; display: block; width: 100%; overflow: hidden; border: 1px solid var(--border); border-radius: .7rem; background: var(--bg); }
.attachment-image img { display: block; width: 100%; max-height: 18rem; object-fit: contain; }
.attachment-image span { position: absolute; right: .4rem; bottom: .4rem; display: flex; align-items: center; gap: .25rem; padding: .28rem .45rem; border-radius: .4rem; color: #fff; background: rgb(0 0 0 / .68); font-size: .62rem; }
.attachment-viewer { position: fixed; inset: 0; z-index: 10000; display: flex; flex-direction: column; padding: 1rem; color: #f8fafc; background: rgb(2 6 23 / .92); backdrop-filter: blur(8px); }
.attachment-viewer header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0 0 .8rem; }
.attachment-viewer header > div:first-child { display: flex; min-width: 0; flex-direction: column; }
.attachment-viewer header strong { font-size: .95rem; }
.attachment-viewer header small { overflow: hidden; color: #94a3b8; text-overflow: ellipsis; white-space: nowrap; }
.attachment-viewer-actions { display: flex; align-items: center; gap: .5rem; }
.attachment-viewer-actions a, .attachment-viewer-actions button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 2.25rem; padding: .45rem .7rem; border: 1px solid rgb(255 255 255 / .2); border-radius: .55rem; color: #fff; background: rgb(255 255 255 / .08); cursor: pointer; }
.attachment-viewer main { display: flex; min-height: 0; flex: 1; align-items: center; justify-content: center; overflow: auto; border-radius: .75rem; background: rgb(0 0 0 / .35); }
.attachment-viewer main img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
@media (max-width: 640px) { .attachment-viewer { padding: .6rem; } .attachment-viewer header small { display: none; } .attachment-viewer-actions a { padding: .45rem; font-size: 0; } .attachment-viewer-actions a i { font-size: 1rem; } }
</style>
