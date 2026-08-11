<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import api from '@/services/api'

const props = defineProps<{ attachmentUrl: string; label: string }>()
const objectUrl = ref('')
const mimeType = ref('')
const failed = ref(false)
const isImage = computed(() => mimeType.value.startsWith('image/'))

onMounted(async () => {
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
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

function openAttachment() {
  if (objectUrl.value) window.open(objectUrl.value, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="attachment-preview">
    <div v-if="!objectUrl && !failed" class="attachment-loading">
      <i class="pi pi-spin pi-spinner" /> Cargando adjunto…
    </div>
    <button v-else-if="objectUrl && isImage" type="button" class="attachment-image" @click="openAttachment">
      <img :src="objectUrl" :alt="label" />
      <span><i class="pi pi-search-plus" /> Abrir captura</span>
    </button>
    <a v-else-if="objectUrl" :href="objectUrl" target="_blank" rel="noopener noreferrer" class="attachment-file">
      <i class="pi pi-paperclip" /> {{ label }}
    </a>
    <span v-else class="attachment-error"><i class="pi pi-exclamation-circle" /> No se pudo cargar el adjunto</span>
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
</style>
