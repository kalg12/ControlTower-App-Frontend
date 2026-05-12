<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { useI18n } from 'vue-i18n'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { watch, computed, onBeforeUnmount } from 'vue'
import {
  Bold, Italic, UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Undo2, Redo2
} from 'lucide-vue-next'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  minHeight?: string
}>(), {
  placeholder: '',
  minHeight: '200px'
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const resolvedPlaceholder = computed(() => props.placeholder || t('richTextEditor.placeholder'))

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    Placeholder.configure({ placeholder: resolvedPlaceholder.value }),
  ],
  editorProps: {
    attributes: { class: 'rte-content focus:outline-none' },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val ?? '', { emitUpdate: false })
  }
})

onBeforeUnmount(() => editor.value?.destroy())

type Level = 1 | 2 | 3
const tools = [
  { icon: Bold,         action: () => editor.value?.chain().focus().toggleBold().run(),         active: () => !!editor.value?.isActive('bold'),         title: t('richTextEditor.bold') },
  { icon: Italic,       action: () => editor.value?.chain().focus().toggleItalic().run(),       active: () => !!editor.value?.isActive('italic'),       title: t('richTextEditor.italic') },
  { icon: UnderlineIcon,action: () => editor.value?.chain().focus().toggleUnderline().run(),   active: () => !!editor.value?.isActive('underline'),    title: t('richTextEditor.underline') },
  null,
  { icon: Heading1,     action: () => editor.value?.chain().focus().toggleHeading({ level: 1 as Level }).run(), active: () => !!editor.value?.isActive('heading', { level: 1 }), title: t('richTextEditor.heading1') },
  { icon: Heading2,     action: () => editor.value?.chain().focus().toggleHeading({ level: 2 as Level }).run(), active: () => !!editor.value?.isActive('heading', { level: 2 }), title: t('richTextEditor.heading2') },
  { icon: Heading3,     action: () => editor.value?.chain().focus().toggleHeading({ level: 3 as Level }).run(), active: () => !!editor.value?.isActive('heading', { level: 3 }), title: t('richTextEditor.heading3') },
  null,
  { icon: List,         action: () => editor.value?.chain().focus().toggleBulletList().run(),   active: () => !!editor.value?.isActive('bulletList'),   title: t('richTextEditor.list') },
  { icon: ListOrdered,  action: () => editor.value?.chain().focus().toggleOrderedList().run(),  active: () => !!editor.value?.isActive('orderedList'),  title: t('richTextEditor.orderedList') },
  { icon: Quote,        action: () => editor.value?.chain().focus().toggleBlockquote().run(),   active: () => !!editor.value?.isActive('blockquote'),   title: t('richTextEditor.blockquote') },
  { icon: Minus,        action: () => editor.value?.chain().focus().setHorizontalRule().run(),  active: () => false,                                    title: t('richTextEditor.divider') },
  null,
  { icon: Undo2,        action: () => editor.value?.chain().focus().undo().run(),               active: () => false,                                    title: t('richTextEditor.undo') },
  { icon: Redo2,        action: () => editor.value?.chain().focus().redo().run(),               active: () => false,                                    title: t('richTextEditor.redo') },
]
</script>

<template>
  <div class="rte-wrapper rounded-[var(--radius)] border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
    <!-- Toolbar -->
    <div class="rte-toolbar flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--surface-raised)]">
      <template v-for="(tool, i) in tools" :key="i">
        <div v-if="tool === null" class="w-px h-5 bg-[var(--border)] mx-1" />
        <button
          v-else
          type="button"
          :title="tool.title"
          :class="[
            'p-1.5 rounded transition-colors',
            tool.active()
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
          ]"
          @mousedown.prevent="tool.action()"
        >
          <component :is="tool.icon" class="w-3.5 h-3.5" />
        </button>
      </template>
    </div>

    <!-- Editor area -->
    <EditorContent
      :editor="editor"
      :style="{ minHeight: minHeight }"
      class="rte-editor px-4 py-3 text-sm text-[var(--text)] overflow-y-auto"
    />
  </div>
</template>

<style>
/* ProseMirror content styles — scoped to .rte-content */
.rte-content h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0 0.25rem; }
.rte-content h2 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.25rem; }
.rte-content h3 { font-size: 1.1rem;  font-weight: 600; margin: 0.5rem 0 0.25rem; }
.rte-content p  { margin: 0.25rem 0; line-height: 1.65; }
.rte-content ul { list-style: disc;    padding-left: 1.5rem; margin: 0.25rem 0; }
.rte-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
.rte-content li { margin: 0.15rem 0; }
.rte-content blockquote {
  border-left: 3px solid var(--primary);
  padding-left: 1rem;
  color: var(--text-muted);
  margin: 0.5rem 0;
  font-style: italic;
}
.rte-content hr { border: none; border-top: 1px solid var(--border); margin: 0.75rem 0; }
.rte-content code {
  background: var(--surface-raised);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.85em;
  font-family: monospace;
}
.rte-content pre {
  background: var(--surface-raised);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.rte-content pre code { background: none; padding: 0; }
.rte-content strong { font-weight: 700; }
.rte-content em { font-style: italic; }
.rte-content u  { text-decoration: underline; }

/* Placeholder */
.rte-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-placeholder, var(--text-muted));
  pointer-events: none;
  height: 0;
}

/* Article content display (read-only v-html) */
.kb-article-body h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.kb-article-body h2 { font-size: 1.25rem; font-weight: 600; margin: 0.9rem 0 0.4rem; }
.kb-article-body h3 { font-size: 1.1rem;  font-weight: 600; margin: 0.75rem 0 0.3rem; }
.kb-article-body p  { margin: 0.4rem 0; line-height: 1.7; }
.kb-article-body ul { list-style: disc;    padding-left: 1.5rem; margin: 0.4rem 0; }
.kb-article-body ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4rem 0; }
.kb-article-body li { margin: 0.2rem 0; }
.kb-article-body blockquote {
  border-left: 3px solid var(--primary);
  padding-left: 1rem;
  color: var(--text-muted);
  margin: 0.5rem 0;
  font-style: italic;
}
.kb-article-body hr { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
.kb-article-body code {
  background: var(--surface-raised);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.85em;
  font-family: monospace;
}
.kb-article-body pre {
  background: var(--surface-raised);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.kb-article-body pre code { background: none; padding: 0; }
.kb-article-body strong { font-weight: 700; }
.kb-article-body em { font-style: italic; }
.kb-article-body u  { text-decoration: underline; }
</style>
