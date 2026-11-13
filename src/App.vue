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

onMounted(() => {
  store.load()
})

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
        <p v-if="!store.storageAvailable" class="warn-bar" role="alert">
          ⚠ 当前浏览器环境不支持本地存储，数据仅在本页面内临时保留。
        </p>
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
