<script setup>
import { computed } from 'vue'
import { formatTime } from '../utils/date.js'

const props = defineProps({
  post: { type: Object, required: true },
  editing: { type: Boolean, default: false }
})

const emit = defineEmits(['edit', 'like', 'delete'])

const timeLabel = computed(() => formatTime(props.post.time))
const likeLabel = computed(() => (props.post.liked ? '取消点赞' : '点赞'))
</script>

<template>
  <article class="post" :class="{ editing }">
    <div class="post-head">
      <h3 class="post-title">{{ post.title }}</h3>
      <span class="post-time">{{ timeLabel }}</span>
      <div class="post-actions">
        <button
          type="button"
          class="btn-icon btn-edit"
          :aria-label="`编辑 ${post.title}`"
          title="编辑这条推送"
          @click="emit('edit', post.id)"
        >
          ✎
        </button>
        <button
          type="button"
          class="btn-icon btn-like"
          :class="{ liked: post.liked }"
          :aria-pressed="String(post.liked)"
          :aria-label="likeLabel"
          :title="likeLabel"
          @click="emit('like', post.id)"
        >
          <span class="like-icon" aria-hidden="true">♥</span>
          <span v-if="post.likes > 0" class="like-count">{{ post.likes }}</span>
        </button>
        <button
          type="button"
          class="btn-icon btn-del"
          :aria-label="`删除 ${post.title}`"
          title="删除这条推送"
          @click="emit('delete', post.id)"
        >
          ✕
        </button>
      </div>
    </div>
    <p class="post-body">{{ post.body }}</p>
  </article>
</template>

<style scoped>
.post {
  position: relative;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(91, 95, 233, 0.12);
  border-radius: 14px;
  padding: 18px 20px;
  animation: popIn 0.45s ease both;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.post:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(91, 95, 233, 0.14);
  border-color: rgba(91, 95, 233, 0.3);
}
.post.editing {
  border-color: rgba(124, 77, 255, 0.45);
  box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.12);
}
.post.editing::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--grad-brand);
}
.post-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.post-title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}
.post-time {
  flex: none;
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-2);
}
.post-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 2px;
}
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  color: var(--text-2);
  background: transparent;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}
.btn-icon:hover {
  color: var(--primary);
  background: rgba(91, 95, 233, 0.1);
  transform: scale(1.1);
}
.btn-del:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}
.btn-like {
  font-size: 13px;
  font-weight: 600;
}
.like-count {
  font-size: 12px;
}
.btn-like.liked {
  color: #fff;
  background: linear-gradient(120deg, var(--primary), var(--primary-2));
  box-shadow: 0 4px 12px rgba(124, 77, 255, 0.32);
  animation: likePop 0.34s ease;
}
.btn-like.liked:hover {
  color: #fff;
  transform: scale(1.06);
}
.post-body {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-2);
  word-break: break-word;
  white-space: pre-wrap;
}
@keyframes likePop {
  0% { transform: scale(1); }
  45% { transform: scale(1.18); }
  100% { transform: scale(1); }
}
</style>
