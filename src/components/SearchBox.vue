<script setup>
import { onBeforeUnmount, shallowRef, watch } from 'vue'

const DEBOUNCE_MS = 120

const props = defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const draft = shallowRef(props.modelValue)
let timer = null

watch(
  () => props.modelValue,
  (value) => {
    draft.value = value
  }
)

function onInput(event) {
  draft.value = event.target.value
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    emit('update:modelValue', draft.value)
  }, DEBOUNCE_MS)
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="search-box">
    <span class="search-icon" aria-hidden="true">🔍</span>
    <input
      class="search-input"
      type="search"
      :value="draft"
      placeholder="搜索标题或正文…"
      aria-label="搜索我的推送"
      autocomplete="off"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.search-box {
  position: relative;
  flex: 1 1 200px;
  min-width: 0;
}
.search-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-2);
  pointer-events: none;
}
.search-input {
  width: 100%;
  font: inherit;
  font-size: 13.5px;
  color: var(--text-1);
  padding: 9px 14px 9px 33px;
  border-radius: 999px;
  border: 1.5px solid rgba(108, 111, 133, 0.22);
  background: rgba(255, 255, 255, 0.85);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.search-input::placeholder {
  color: rgba(108, 111, 133, 0.7);
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(91, 95, 233, 0.12);
}
@media (max-width: 860px) {
  .search-box {
    flex: 1 1 100%;
  }
}
</style>
