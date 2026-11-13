<script setup>
import { computed } from 'vue'
import { buildHotList } from '../utils/hotTopics.js'

const props = defineProps({
  date: { type: Date, default: () => new Date() }
})

const emit = defineEmits(['prefill'])

const hotList = computed(() => buildHotList({ date: props.date }))

function select(topic) {
  emit('prefill', topic.title)
}

function onKeydown(event, topic) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  select(topic)
}
</script>

<template>
  <section class="card" aria-label="今日热搜">
    <h2 class="card-title">
      <span class="dot" aria-hidden="true" />今日热搜
    </h2>
    <p class="card-sub">看看世界正在关注什么</p>
    <div class="hot-list">
      <div
        v-for="(topic, index) in hotList"
        :key="topic.title"
        class="hot-item"
        role="button"
        tabindex="0"
        :aria-label="`${topic.title}，点击预填到发布表单`"
        :style="{ animationDelay: `${index * 60}ms` }"
        @click="select(topic)"
        @keydown="onKeydown($event, topic)"
      >
        <span class="rank" :class="index < 3 ? `rank-${index + 1}` : ''">{{ index + 1 }}</span>
        <div class="hot-main">
          <div class="hot-title">{{ topic.title }}</div>
          <div class="hot-meta">
            <span class="tag">{{ topic.cat }}</span>
            <span class="heat-bar"><i class="heat-fill" :style="{ width: `${topic.heat}%` }" /></span>
            <span class="heat-num">{{ topic.heat }} 万热度</span>
          </div>
        </div>
        <span class="go" aria-hidden="true">去发布 ›</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hot-list {
  margin-top: 6px;
}
.hot-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 12px;
  border-radius: 12px;
  cursor: pointer;
  animation: fadeUp 0.5s ease both;
  transition: background 0.2s ease, transform 0.2s ease;
}
.hot-item:hover {
  background: rgba(124, 77, 255, 0.08);
  transform: translateX(4px);
}
.hot-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.hot-item + .hot-item {
  border-top: 1px dashed rgba(108, 111, 133, 0.18);
}
.rank {
  flex: none;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-2);
  background: rgba(108, 111, 133, 0.1);
}
.rank-1 {
  background: linear-gradient(120deg, #5b5fe9, #7c4dff);
  color: #fff;
  box-shadow: 0 4px 12px rgba(124, 77, 255, 0.35);
}
.rank-2 {
  background: linear-gradient(120deg, #7c4dff, #b388ff);
  color: #fff;
  box-shadow: 0 4px 12px rgba(124, 77, 255, 0.28);
}
.rank-3 {
  background: linear-gradient(120deg, #ff7a9a, #ffa45c);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 122, 154, 0.35);
}
.hot-main {
  flex: 1;
  min-width: 0;
}
.hot-title {
  font-size: 14.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hot-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}
.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--primary);
  background: rgba(91, 95, 233, 0.1);
}
.heat-bar {
  flex: 1;
  max-width: 110px;
  height: 5px;
  border-radius: 999px;
  background: rgba(108, 111, 133, 0.15);
  overflow: hidden;
}
.heat-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--grad-brand);
  animation: grow 1s ease both;
}
.heat-num {
  min-width: 42px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}
.go {
  flex: none;
  font-size: 11px;
  color: var(--primary);
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.hot-item:hover .go,
.hot-item:focus-visible .go {
  opacity: 1;
  transform: none;
}
</style>
