export const STORAGE_KEY = 'xjjg_posts'
export const TITLE_MAX = 60
export const BODY_MAX = 1000

function defaultStorage() {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

function resolveStorage(storage) {
  return storage === undefined ? defaultStorage() : storage
}

/** 探测存储是否可读写（隐私模式、被禁用时返回 false） */
export function isStorageAvailable(storage) {
  const target = resolveStorage(storage)
  if (!target) return false
  try {
    const probe = '__xjjg_probe__'
    target.setItem(probe, '1')
    target.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** 归一化数据：过滤脏数据、补 likes/liked、截断超长文本（兼容 v1.x 记录） */
export function normalizePosts(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter(
      (post) =>
        post &&
        typeof post === 'object' &&
        typeof post.id === 'number' &&
        (typeof post.title === 'string' || typeof post.body === 'string')
    )
    .map((post) => ({
      id: post.id,
      title: typeof post.title === 'string' ? post.title.slice(0, TITLE_MAX) : '',
      body: typeof post.body === 'string' ? post.body.slice(0, BODY_MAX) : '',
      time: Number.isFinite(post.time) ? post.time : Date.now(),
      likes: Number.isFinite(post.likes) && post.likes > 0 ? Math.floor(post.likes) : 0,
      liked: post.liked === true
    }))
}

/** 读取推送列表；存储不可用或数据损坏时返回空数组 */
export function readPosts(storage) {
  const target = resolveStorage(storage)
  if (!target) return []
  try {
    const raw = target.getItem(STORAGE_KEY)
    if (!raw) return []
    return normalizePosts(JSON.parse(raw))
  } catch {
    return []
  }
}

/** 写入推送列表；失败时返回错误信息而不抛出异常 */
export function writePosts(list, storage) {
  const target = resolveStorage(storage)
  if (!target) return { ok: false, error: '当前环境不支持本地存储' }
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(list))
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : '本地存储写入失败'
    }
  }
}
