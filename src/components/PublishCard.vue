<script setup>
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePostsStore } from '../stores/posts.js'

const HINT_DURATION = 2600

const store = usePostsStore()
const { editingPost } = storeToRefs(store)

const title = shallowRef('')
const body = shallowRef('')
const hint = shallowRef('')
const hintType = shallowRef('ok')

const titleInput = useTemplateRef('titleInput')
const bodyInput = useTemplateRef('bodyInput')

let hintTimer = null

const isEditing = computed(() => editingPost.value !== null)
const submitLabel = computed(() => (isEditing.value ? '保存修改' : '发 布'))
const heading = computed(() => (isEditing.value ? '编辑推送' : '发布推送'))

// flush: 'sync' 让表单在编辑态切换时立刻同步，prefill 可安全地先退出编辑再写入
watch(
  editingPost,
  (post) => {
    title.value = post ? post.title : ''
    body.value = post ? post.body : ''
  },
  { immediate: true, flush: 'sync' }
)

function showHint(message, ok) {
  hint.value = message
  hintType.value = ok ? 'ok' : 'err'
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    hint.value = ''
  }, HINT_DURATION)
}

function resetForm() {
  title.value = ''
  body.value = ''
}

function submit() {
  const payload = { title: title.value, body: body.value }
  const result = editingPost.value
    ? store.updateEditing(payload)
    : store.publish(payload)

  showHint(result.message, result.ok)
  if (result.ok) resetForm()
}

function cancel() {
  store.cancelEdit()
  resetForm()
  showHint('已取消编辑', true)
}

/** 供热搜联动调用：预填标题并聚焦正文 */
function prefill(value) {
  if (isEditing.value) store.cancelEdit()
  title.value = value || ''
  body.value = ''
  bodyInput.value?.focus()
}

function focusTitle() {
  titleInput.value?.focus()
}

onBeforeUnmount(() => {
  if (hintTimer) clearTimeout(hintTimer)
})

defineExpose({ prefill, focusTitle })
</script>

<template>
  <section class="card" aria-label="发布推送">
    <h2 class="card-title">
      <span class="dot" aria-hidden="true" />{{ heading }}
    </h2>
    <p class="card-sub">记录此刻想法，仅保存在你的浏览器中</p>

    <form class="publish-form" @submit.prevent="submit">
      <div class="form-row">
        <label class="form-label" for="titleInput">标题</label>
        <input
          id="titleInput"
          ref="titleInput"
          v-model="title"
          class="form-input"
          type="text"
          maxlength="60"
          placeholder="给这条推送起个标题（最多 60 字）"
          autocomplete="off"
        />
      </div>
      <div class="form-row">
        <label class="form-label" for="bodyInput">正文</label>
        <textarea
          id="bodyInput"
          ref="bodyInput"
          v-model="body"
          class="form-textarea"
          maxlength="1000"
          placeholder="想推送点什么？写下来吧（最多 1000 字）"
        />
      </div>
      <div class="form-btns" :class="{ 'edit-mode': isEditing }">
        <button type="submit" class="btn-publish">{{ submitLabel }}</button>
        <button v-if="isEditing" type="button" class="btn-cancel" @click="cancel">取消编辑</button>
      </div>
      <p class="hint" :class="[hintType, { show: hint }]" role="status">{{ hint }}</p>
    </form>
  </section>
</template>

<style scoped>
.form-row {
  margin-bottom: 16px;
}
.form-label {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}
.form-input,
.form-textarea {
  width: 100%;
  font: inherit;
  font-size: 14px;
  color: var(--text-1);
  padding: 11px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(108, 111, 133, 0.25);
  background: rgba(255, 255, 255, 0.85);
  outline: none;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.form-textarea {
  min-height: 96px;
}
.form-input:focus,
.form-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(91, 95, 233, 0.12);
}
.form-btns {
  display: flex;
  gap: 10px;
}
.btn-publish {
  flex: 1;
  padding: 13px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: var(--grad-brand);
  background-size: 180% 180%;
  box-shadow: 0 8px 20px rgba(124, 77, 255, 0.32);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-position 0.4s ease;
}
.btn-publish:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(124, 77, 255, 0.42);
  background-position: 100% 0;
}
.btn-publish:active {
  transform: translateY(0);
}
.btn-cancel {
  flex: none;
  padding: 0 20px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.9);
  border: 1.5px solid rgba(108, 111, 133, 0.25);
  border-radius: 12px;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.btn-cancel:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: rgba(91, 95, 233, 0.06);
}
.hint {
  min-height: 20px;
  margin-top: 12px;
  font-size: 13px;
  text-align: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.hint.show {
  opacity: 1;
}
.hint.err {
  color: var(--danger);
}
.hint.ok {
  color: var(--success);
}
</style>
