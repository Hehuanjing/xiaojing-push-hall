import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { createPostsApi } from '../services/postApi.js'
import { readPosts, writePosts } from '../services/postStorage.js'
import {
  VALIDATION_MESSAGE,
  normalizePost,
  normalizePosts,
  validatePostInput
} from '../../shared/postSchema.js'

const MESSAGE = {
  published: '发布成功 ✓ 已同步到服务端',
  publishedOffline: '发布成功 ✓ 已暂存到本地缓存',
  updated: '修改已保存 ✓',
  updatedOffline: '修改已保存 ✓ 已暂存到本地缓存',
  offline: '服务端暂不可用，已切换到本地缓存模式',
  noTarget: '没有正在编辑的推送',
  missing: '该推送已不存在',
  requestFailed: '操作失败，请稍后重试',
  cacheUnavailable: '已保存，但本地缓存不可用，刷新后会丢失'
}

/** 网络不可达（status 0）或服务端 5xx 视为后端不可用，可降级到本地缓存 */
function isUnavailable(error) {
  if (!error || typeof error.status !== 'number') return true
  return error.status === 0 || error.status >= 500
}

export const usePostsStore = defineStore('posts', () => {
  const posts = ref([])
  const keyword = shallowRef('')
  const editingId = shallowRef(null)
  const lastError = shallowRef('')
  const apiAvailable = shallowRef(true)
  const loading = shallowRef(false)

  // 可注入的后端客户端（测试/自定义环境）；默认走同源 /api
  let api = createPostsApi()
  let idSeq = 0
  // 同一条目的点赞请求在途时忽略重复点击，避免基于陈旧状态连发
  const pendingLikes = new Set()

  // 同一毫秒内发布的条目用 id 兜底排序，保证新发布的始终在前
  const sortedPosts = computed(() =>
    [...posts.value].sort((a, b) => b.time - a.time || b.id - a.id)
  )

  const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

  const isFiltering = computed(() => normalizedKeyword.value.length > 0)

  const filteredPosts = computed(() => {
    const query = normalizedKeyword.value
    if (!query) return sortedPosts.value
    return sortedPosts.value.filter((post) =>
      `${post.title} ${post.body}`.toLowerCase().includes(query)
    )
  })

  const counts = computed(() => ({
    total: posts.value.length,
    matched: filteredPosts.value.length,
    isFiltering: isFiltering.value
  }))

  const editingPost = computed(
    () => posts.value.find((post) => post.id === editingId.value) || null
  )

  function configure(options = {}) {
    if (options.api) api = options.api
  }

  function nextId() {
    idSeq += 1
    return Date.now() * 1000 + idSeq
  }

  function markOnline() {
    apiAvailable.value = true
    lastError.value = ''
  }

  function markOffline() {
    apiAvailable.value = false
    lastError.value = MESSAGE.offline
  }

  /** @returns {boolean} 缓存是否写入成功（失败只影响离线能力，不改变在线状态） */
  function persistCache() {
    return writePosts(posts.value).ok
  }

  /** 原地合并服务端结果，保持对象引用稳定，避免编辑中的表单被 watch 重置 */
  function replacePost(post) {
    const normalized = normalizePost(post)
    if (!normalized) return null
    const target = posts.value.find((item) => item.id === normalized.id)
    if (target) Object.assign(target, normalized)
    else posts.value.push(normalized)
    return normalized
  }

  function dropLocal(id) {
    posts.value = posts.value.filter((post) => post.id !== id)
    if (editingId.value === id) editingId.value = null
  }

  /** 读取数据：优先服务端，失败则回落到本地缓存 */
  async function load() {
    loading.value = true
    try {
      const list = await api.list()
      posts.value = normalizePosts(list)
      markOnline()
      persistCache()
      return { ok: true }
    } catch {
      posts.value = readPosts()
      markOffline()
      return { ok: false, message: MESSAGE.offline }
    } finally {
      loading.value = false
    }
  }

  async function publish(payload) {
    const checked = validatePostInput(payload)
    if (!checked.ok) return { ok: false, message: checked.message }

    const content = { title: checked.title, body: checked.body }

    try {
      const created = await api.create(content)
      const normalized = normalizePost(created)
      if (!normalized) {
        const error = new Error(MESSAGE.requestFailed)
        error.status = 502
        throw error
      }

      replacePost(normalized)
      markOnline()
      persistCache()
      return { ok: true, message: MESSAGE.published }
    } catch (error) {
      if (!isUnavailable(error)) {
        const message = error?.message || MESSAGE.requestFailed
        lastError.value = message
        return { ok: false, message }
      }

      posts.value.push({
        id: nextId(),
        title: content.title,
        body: content.body,
        time: Date.now(),
        likes: 0,
        liked: false
      })
      markOffline()
      const cached = persistCache()
      return { ok: true, message: cached ? MESSAGE.publishedOffline : MESSAGE.cacheUnavailable }
    }
  }

  function startEdit(id) {
    if (!posts.value.some((post) => post.id === id)) return
    editingId.value = id
  }

  async function updateEditing(payload) {
    if (editingId.value === null) return { ok: false, message: MESSAGE.noTarget }

    const checked = validatePostInput(payload)
    if (!checked.ok) return { ok: false, message: checked.message }

    const id = editingId.value
    const target = posts.value.find((post) => post.id === id)
    if (!target) {
      editingId.value = null
      return { ok: false, message: MESSAGE.missing }
    }

    const content = { title: checked.title, body: checked.body }

    try {
      const updated = await api.update(id, content)
      replacePost(updated)
      editingId.value = null
      markOnline()
      persistCache()
      return { ok: true, message: MESSAGE.updated }
    } catch (error) {
      if (error?.status === 404) {
        editingId.value = null
        return { ok: false, message: MESSAGE.missing }
      }

      if (!isUnavailable(error)) {
        const message = error?.message || MESSAGE.requestFailed
        lastError.value = message
        return { ok: false, message }
      }

      target.title = content.title
      target.body = content.body
      target.time = Date.now()
      editingId.value = null
      markOffline()
      const cached = persistCache()
      return { ok: true, message: cached ? MESSAGE.updatedOffline : MESSAGE.cacheUnavailable }
    }
  }

  function cancelEdit() {
    editingId.value = null
  }

  async function toggleLike(id) {
    if (pendingLikes.has(id)) return { ok: false, message: '' }

    pendingLikes.add(id)
    try {
      return await doToggleLike(id)
    } finally {
      pendingLikes.delete(id)
    }
  }

  function applyLocalLike(post, nextLiked) {
    post.liked = nextLiked
    post.likes = Math.max(0, post.likes + (nextLiked ? 1 : -1))
  }

  async function doToggleLike(id) {
    const post = posts.value.find((item) => item.id === id)
    if (!post) return { ok: false, message: MESSAGE.missing }

    const nextLiked = !post.liked

    try {
      const updated = await api.like(id, nextLiked)
      replacePost(updated)
      markOnline()
      persistCache()
      return { ok: true, message: '' }
    } catch (error) {
      // 404 说明服务端没有这条（多为离线期间新建），保留本地内容而不是删除
      if (error?.status === 404) {
        applyLocalLike(post, nextLiked)
        persistCache()
        return { ok: true, message: MESSAGE.missing }
      }

      if (!isUnavailable(error)) {
        const message = error?.message || MESSAGE.requestFailed
        lastError.value = message
        return { ok: false, message }
      }

      applyLocalLike(post, nextLiked)
      markOffline()
      persistCache()
      return { ok: true, message: '' }
    }
  }

  async function remove(id) {
    if (!posts.value.some((post) => post.id === id)) {
      return { ok: false, message: MESSAGE.missing }
    }

    try {
      await api.remove(id)
      markOnline()
    } catch (error) {
      // 404 说明服务端已经没有该条目，继续清理本地即可
      if (error?.status !== 404) {
        if (!isUnavailable(error)) {
          const message = error?.message || MESSAGE.requestFailed
          lastError.value = message
          return { ok: false, message }
        }
        markOffline()
      }
    }

    dropLocal(id)
    persistCache()
    return { ok: true, message: '' }
  }

  function setKeyword(value) {
    keyword.value = typeof value === 'string' ? value : ''
  }

  function clearError() {
    lastError.value = ''
  }

  return {
    // state
    posts,
    keyword,
    editingId,
    lastError,
    apiAvailable,
    loading,
    // getters
    sortedPosts,
    filteredPosts,
    counts,
    editingPost,
    isFiltering,
    // actions
    configure,
    load,
    publish,
    startEdit,
    updateEditing,
    cancelEdit,
    toggleLike,
    remove,
    setKeyword,
    clearError
  }
})
