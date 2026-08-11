<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ content: string }>()
const copied = ref(false)

type ClickDetail = {
  action: string
  component: string
  element: string
  route: string
}

function section(lines: string[], start: string, end?: string) {
  const from = lines.findIndex(line => line === start)
  if (from === -1) return []
  const to = end ? lines.findIndex((line, index) => index > from && line === end) : lines.length
  return lines.slice(from + 1, to === -1 ? lines.length : to).filter(Boolean)
}

const diagnostic = computed(() => {
  const lines = props.content.split('\n').map(line => line.trimEnd())
  const errors = section(lines, 'Errores recientes:', 'Ruta de navegación:')
  const routes = section(lines, 'Ruta de navegación:', 'Últimos clics:')
  const clickLines = section(lines, 'Últimos clics:')
  const clicks: ClickDetail[] = []

  for (const rawLine of clickLines) {
    const line = rawLine.trim()
    const action = line.match(/^\d+\. Acción:\s*(.+)$/)
    if (action) {
      clicks.push({ action: action[1], component: '', element: '', route: '' })
      continue
    }
    const current = clicks.at(-1)
    if (!current) continue
    if (line.startsWith('Componente:')) current.component = line.replace('Componente:', '').trim()
    else if (line.startsWith('Elemento:')) current.element = line.replace('Elemento:', '').trim()
    else if (line.startsWith('Ruta:')) current.route = line.replace('Ruta:', '').trim()
  }

  const value = (label: string) => {
    const line = lines.find(item => item.startsWith(`${label}:`))
    return line?.slice(label.length + 1).trim() ?? 'No disponible'
  }

  return {
    page: value('Página'),
    path: value('Ruta'),
    version: value('Versión'),
    viewport: value('Pantalla'),
    locale: value('Idioma/Zona'),
    connection: value('Conexión'),
    browser: value('Navegador'),
    capturedAt: value('Hora'),
    errors,
    routes,
    clicks,
  }
})

const hasErrors = computed(() =>
  diagnostic.value.errors.some(error => !error.toLowerCase().includes('ninguno detectado')),
)

async function copyDiagnostic() {
  await navigator.clipboard.writeText(props.content)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}
</script>

<template>
  <article class="diagnostic-card">
    <header class="diagnostic-header">
      <div class="diagnostic-icon"><i class="pi pi-wrench" /></div>
      <div class="min-w-0">
        <strong>Diagnóstico del POS</strong>
        <p>{{ diagnostic.page }}</p>
      </div>
      <button type="button" :aria-label="copied ? 'Diagnóstico copiado' : 'Copiar diagnóstico'" @click="copyDiagnostic">
        <i :class="copied ? 'pi pi-check' : 'pi pi-copy'" />
        <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
      </button>
    </header>

    <div class="diagnostic-route">
      <i class="pi pi-map-marker" />
      <code>{{ diagnostic.path }}</code>
      <span :class="diagnostic.connection === 'en línea' ? 'is-online' : 'is-offline'">
        {{ diagnostic.connection }}
      </span>
    </div>

    <dl class="diagnostic-meta">
      <div><dt>Versión</dt><dd>{{ diagnostic.version }}</dd></div>
      <div><dt>Pantalla</dt><dd>{{ diagnostic.viewport }}</dd></div>
      <div><dt>Idioma y zona</dt><dd>{{ diagnostic.locale }}</dd></div>
      <div><dt>Capturado</dt><dd>{{ diagnostic.capturedAt }}</dd></div>
    </dl>

    <div class="diagnostic-browser" :title="diagnostic.browser">
      <i class="pi pi-desktop" />{{ diagnostic.browser }}
    </div>

    <details class="diagnostic-section" :open="hasErrors">
      <summary>
        <span><i class="pi pi-exclamation-triangle" /> Errores recientes</span>
        <span class="diagnostic-count" :class="{ 'has-errors': hasErrors }">
          {{ hasErrors ? diagnostic.errors.length : 0 }}
        </span>
      </summary>
      <div class="diagnostic-section-body">
        <p v-for="(error, index) in diagnostic.errors" :key="index" :class="{ 'error-line': hasErrors }">
          {{ error }}
        </p>
      </div>
    </details>

    <details class="diagnostic-section">
      <summary>
        <span><i class="pi pi-directions" /> Navegación reciente</span>
        <span class="diagnostic-count">{{ diagnostic.routes.length }}</span>
      </summary>
      <ol class="diagnostic-list">
        <li v-for="(route, index) in diagnostic.routes" :key="index">{{ route.replace(/^\d+\.\s*/, '') }}</li>
      </ol>
    </details>

    <details class="diagnostic-section">
      <summary>
        <span><i class="pi pi-cursor" /> Últimos clics</span>
        <span class="diagnostic-count">{{ diagnostic.clicks.length }}</span>
      </summary>
      <div class="diagnostic-clicks">
        <div v-for="(click, index) in diagnostic.clicks" :key="index" class="diagnostic-click">
          <span class="click-index">{{ index + 1 }}</span>
          <div>
            <strong>{{ click.action }}</strong>
            <p v-if="click.component"><i class="pi pi-box" /> {{ click.component }}</p>
            <p v-if="click.element"><i class="pi pi-cursor" /> {{ click.element }}</p>
            <p v-if="click.route"><i class="pi pi-map-marker" /> {{ click.route }}</p>
          </div>
        </div>
      </div>
    </details>
  </article>
</template>

<style scoped>
.diagnostic-card { width: min(42rem, 100%); overflow: hidden; border: 1px solid color-mix(in srgb, #f97316 42%, var(--border)); border-radius: .875rem; background: var(--surface-raised); color: var(--text); box-shadow: 0 8px 24px rgb(0 0 0 / .14); }
.diagnostic-header { display: flex; align-items: center; gap: .65rem; padding: .75rem; background: color-mix(in srgb, #f97316 10%, var(--bg)); border-bottom: 1px solid color-mix(in srgb, #f97316 25%, var(--border)); }
.diagnostic-icon { display: grid; width: 2rem; height: 2rem; flex: 0 0 auto; place-items: center; border-radius: .6rem; color: #fff; background: #f97316; }
.diagnostic-header strong { display: block; font-size: .8rem; }
.diagnostic-header p { overflow: hidden; margin-top: .08rem; color: var(--text-muted); font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }
.diagnostic-header button { display: flex; align-items: center; gap: .3rem; margin-left: auto; padding: .35rem .5rem; border: 1px solid var(--border); border-radius: .45rem; color: var(--text-muted); background: var(--bg); font-size: .65rem; }
.diagnostic-header button:hover { color: var(--text); border-color: #f97316; }
.diagnostic-route { display: flex; align-items: center; gap: .45rem; padding: .6rem .75rem; border-bottom: 1px solid var(--border); }
.diagnostic-route > i { color: #f97316; font-size: .75rem; }
.diagnostic-route code { overflow: hidden; color: var(--text); font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.diagnostic-route span { flex: 0 0 auto; margin-left: auto; padding: .15rem .4rem; border-radius: 9999px; font-size: .6rem; font-weight: 700; }
.is-online { color: #16a34a; background: color-mix(in srgb, #22c55e 14%, transparent); }
.is-offline { color: #dc2626; background: color-mix(in srgb, #ef4444 14%, transparent); }
.diagnostic-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; padding: .7rem .75rem; }
.diagnostic-meta div { min-width: 0; }
.diagnostic-meta dt { color: var(--text-muted); font-size: .58rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.diagnostic-meta dd { overflow: hidden; margin-top: .1rem; font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
.diagnostic-browser { overflow: hidden; margin: 0 .75rem .7rem; padding: .4rem .5rem; border-radius: .4rem; color: var(--text-muted); background: var(--bg-subtle); font-size: .62rem; text-overflow: ellipsis; white-space: nowrap; }
.diagnostic-browser i { margin-right: .35rem; }
.diagnostic-section { border-top: 1px solid var(--border); }
.diagnostic-section summary { display: flex; align-items: center; justify-content: space-between; padding: .6rem .75rem; cursor: pointer; color: var(--text); font-size: .7rem; font-weight: 700; list-style: none; }
.diagnostic-section summary::-webkit-details-marker { display: none; }
.diagnostic-section summary i { width: 1rem; color: #f97316; }
.diagnostic-count { display: grid; min-width: 1.2rem; height: 1.2rem; place-items: center; border-radius: 9999px; color: var(--text-muted); background: var(--bg-subtle); font-size: .58rem; }
.diagnostic-count.has-errors { color: #ef4444; background: color-mix(in srgb, #ef4444 14%, transparent); }
.diagnostic-section-body, .diagnostic-list, .diagnostic-clicks { margin: 0; padding: 0 .75rem .7rem 2rem; color: var(--text-muted); font-size: .67rem; line-height: 1.45; }
.diagnostic-section-body { padding-left: .75rem; }
.diagnostic-section-body p + p { margin-top: .3rem; }
.diagnostic-section-body .error-line { padding: .4rem .5rem; border-left: 2px solid #ef4444; border-radius: .25rem; color: #dc2626; background: color-mix(in srgb, #ef4444 8%, transparent); }
.diagnostic-list li + li { margin-top: .25rem; }
.diagnostic-clicks { display: grid; gap: .45rem; padding-left: .75rem; }
.diagnostic-click { display: grid; grid-template-columns: 1.35rem minmax(0, 1fr); gap: .45rem; padding: .5rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg); }
.click-index { display: grid; width: 1.25rem; height: 1.25rem; place-items: center; border-radius: .35rem; color: #f97316; background: color-mix(in srgb, #f97316 13%, transparent); font-weight: 800; }
.diagnostic-click strong { display: block; color: var(--text); font-size: .68rem; }
.diagnostic-click p { margin-top: .22rem; color: var(--text-muted); font-size: .62rem; overflow-wrap: anywhere; }
.diagnostic-click p i { width: .85rem; color: #f97316; font-size: .58rem; }
@media (max-width: 640px) { .diagnostic-meta { grid-template-columns: 1fr; } .diagnostic-header button span { display: none; } }
</style>
