<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePostsStore } from '../stores/posts.js'
import PostItem from './PostItem.vue'
import SearchBox from './SearchBox.vue'

const store = usePostsStore()
const { filteredPosts, counts, editingId, keyword, loading } = storeToRefs(store)

const countLabel = computed(() => {
  const { total, matched, isFiltering } = counts.value
  if (isFiltering && total > 0) return `共 ${total} 条 · 命中 ${matched} 条`
  return `共 ${total} 条`
})

function onKeyword(value) {
  store.setKeyword(value)
}

function onEdit(id) {
  store.startEdit(id)
}

async function onLike(id) {
  await store.toggleLike(id)
}

async function onDelete(id) {
  const post = store.posts.find((item) => item.id === id)
  const shortTitle = post
    ? `「${post.title.slice(0, 12)}${post.title.length > 12 ? '…' : ''}」`
    : '这条推送'
  if (!window.confirm(`确定要删除${shortTitle}吗？`)) return
  await store.remove(id)
}
</script>

<template>
  <section class="card" aria-label="我的推送">
    <h2 class="card-title">
      <span class="dot" aria-hidden="true" />我的推送
    </h2>

    <div class="list-head">
      <SearchBox :model-value="keyword" @update:model-value="onKeyword" />
      <span class="count-chip">{{ countLabel }}</span>
    </div>

    <div v-if="loading" class="empty">
      <div class="empty-icon" aria-hidden="true">⏳</div>
      正在从服务端加载推送…
    </div>
    <div v-else-if="counts.total === 0" class="empty">
      <div class="empty-icon" aria-hidden="true">📭</div>
      还没有推送，快来发布第一条吧！
    </div>
    <div v-else-if="counts.matched === 0" class="empty">
      <div class="empty-icon" aria-hidden="true">🔍</div>
      没有匹配「{{ keyword.trim() }}」的推送
      <div class="empty-tip">换个关键词试试，或清空搜索框</div>
    </div>
    <div v-else class="post-list">
      <PostItem
        v-for="post in filteredPosts"
        :key="post.id"
        :post="post"
        :editing="post.id === editingId"
        @edit="onEdit"
        @like="onLike"
        @delete="onDelete"
      />
    </div>
  </section>
</template>

<style scoped>
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.count-chip {
  flex: none;
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
}
.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 6px;
}
.empty {
  padding: 34px 10px;
  text-align: center;
  font-size: 14px;
  color: var(--text-2);
}
.empty-icon {
  margin-bottom: 10px;
  font-size: 34px;
  opacity: 0.55;
}
.empty-tip {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.8;
}
@media (max-width: 860px) {
  .list-head {
    align-items: stretch;
  }
}
</style>
