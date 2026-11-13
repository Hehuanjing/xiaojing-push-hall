import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { isStorageAvailable, readPosts, writePosts } from '../services/postStorage.js'

const MESSAGE = {
  empty: '标题和正文不能都为空哦～',
  title: '请填写标题',
  body: '请填写正文内容',
  published: '发布成功 ✓ 已保存到本地',
  updated: '修改已保存 ✓',
  unavailable: '当前浏览器环境不支持本地存储，数据仅在本页面内临时保留',
  noTarget: '没有正在编辑的推送',
  missing: '该推送已不存在'
}

export const usePostsStore = defineStore('posts', () => {
  const posts = ref([])
  const keyword = shallowRef('')
  const editingId = shallowRef(null)
  const lastError = shallowRef('')
  const storageAvailable = shallowRef(true)

  // 可注入的存储（测试用），默认回落到 window.localStorage
  let storage
  let idSeq = 0

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

  function nextId() {
    idSeq += 1
    return Date.now() * 1000 + idSeq
  }

  function validate(payload) {
    const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
    const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
    if (!title && !body) return { ok: false, message: MESSAGE.empty }
    if (!title) return { ok: false, message: MESSAGE.title }
    if (!body) return { ok: false, message: MESSAGE.body }
    return { ok: true, title, body }
  }

  function persist() {
    const result = writePosts(posts.value, storage)
    storageAvailable.value = result.ok
    lastError.value = result.ok ? '' : result.error
    return result.ok
  }

  /** 读取本地数据；传入 storage 可替换存储实现（测试注入） */
  function load(target) {
    if (target !== undefined) storage = target
    const available = isStorageAvailable(storage)
    storageAvailable.value = available
    posts.value = readPosts(storage)
    lastError.value = available ? '' : MESSAGE.unavailable
  }

  function publish(payload) {
    const checked = validate(payload)
    if (!checked.ok) return { ok: false, message: checked.message }

    posts.value.push({
      id: nextId(),
      title: checked.title,
      body: checked.body,
      time: Date.now(),
      likes: 0,
      liked: false
    })
    persist()
    return { ok: true, message: MESSAGE.published }
  }

  function startEdit(id) {
    if (!posts.value.some((post) => post.id === id)) return
    editingId.value = id
  }

  function updateEditing(payload) {
    if (editingId.value === null) return { ok: false, message: MESSAGE.noTarget }

    const checked = validate(payload)
    if (!checked.ok) return { ok: false, message: checked.message }

    const post = posts.value.find((item) => item.id === editingId.value)
    if (!post) {
      editingId.value = null
      return { ok: false, message: MESSAGE.missing }
    }

    post.title = checked.title
    post.body = checked.body
    post.time = Date.now()
    editingId.value = null
    persist()
    return { ok: true, message: MESSAGE.updated }
  }

  function cancelEdit() {
    editingId.value = null
  }

  function toggleLike(id) {
    const post = posts.value.find((item) => item.id === id)
    if (!post) return

    if (post.liked) {
      post.liked = false
      post.likes = Math.max(0, post.likes - 1)
    } else {
      post.liked = true
      post.likes += 1
    }
    persist()
  }

  function remove(id) {
    const remaining = posts.value.filter((post) => post.id !== id)
    if (remaining.length === posts.value.length) return

    posts.value = remaining
    if (editingId.value === id) editingId.value = null
    persist()
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
    storageAvailable,
    // getters
    sortedPosts,
    filteredPosts,
    counts,
    editingPost,
    isFiltering,
    // actions
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
