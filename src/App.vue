<script setup>
import { onMounted, useTemplateRef } from 'vue'
import AppHeader from './components/AppHeader.vue'
import HotTopicCard from './components/HotTopicCard.vue'
import PublishCard from './components/PublishCard.vue'
import PostListCard from './components/PostListCard.vue'
import { usePostsStore } from './stores/posts.js'

const store = usePostsStore()
const publishArea = useTemplateRef('publishArea')
const publishCard = useTemplateRef('publishCard')

onMounted(async () => {
  await store.load()
})

async function reconnect() {
  await store.load()
}

function onPrefill(title) {
  publishArea.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  publishCard.value?.prefill(title)
}
</script>

<template>
  <AppHeader />

  <main class="layout">
    <HotTopicCard @prefill="onPrefill" />

    <div class="layout-side">
      <div ref="publishArea" class="publish-area">
        <div v-if="!store.apiAvailable" class="warn-bar" role="alert">
          <span>⚠ 服务端暂不可用，已切换到本地缓存模式。</span>
          <button type="button" class="warn-retry" @click="reconnect">重试连接</button>
        </div>
        <PublishCard ref="publishCard" />
      </div>
      <PostListCard />
    </div>
  </main>
</template>

<style scoped>
.publish-area {
  scroll-margin-top: 24px;
}
</style>
