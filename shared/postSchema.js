/**
 * 前后端共享的推送数据结构约定：
 * 常量、输入校验与归一化只在这里维护一份，避免服务端与前端文案/规则漂移。
 */

export const TITLE_MAX = 60
export const BODY_MAX = 1000

export const VALIDATION_MESSAGE = {
  empty: '标题和正文不能都为空哦～',
  title: '请填写标题',
  body: '请填写正文内容'
}

/**
 * 校验发布/编辑入参。
 * @returns {{ ok: true, title: string, body: string } | { ok: false, message: string }}
 */
export function validatePostInput(payload) {
  const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
  const body = typeof payload?.body === 'string' ? payload.body.trim() : ''

  if (!title && !body) return { ok: false, message: VALIDATION_MESSAGE.empty }
  if (!title) return { ok: false, message: VALIDATION_MESSAGE.title }
  if (!body) return { ok: false, message: VALIDATION_MESSAGE.body }

  return {
    ok: true,
    title: title.slice(0, TITLE_MAX),
    body: body.slice(0, BODY_MAX)
  }
}

function isValidId(id) {
  return typeof id === 'number' && Number.isFinite(id)
}

/** 归一化单条推送；非法输入返回 null（兼容 v1.x 缺少 likes/liked 的记录） */
export function normalizePost(post) {
  if (!post || typeof post !== 'object' || !isValidId(post.id)) return null
  if (typeof post.title !== 'string' && typeof post.body !== 'string') return null

  return {
    id: post.id,
    title: typeof post.title === 'string' ? post.title.slice(0, TITLE_MAX) : '',
    body: typeof post.body === 'string' ? post.body.slice(0, BODY_MAX) : '',
    time: Number.isFinite(post.time) ? post.time : Date.now(),
    likes: Number.isFinite(post.likes) && post.likes > 0 ? Math.floor(post.likes) : 0,
    liked: post.liked === true
  }
}

/** 归一化推送列表；过滤脏数据、补 likes/liked、截断超长文本 */
export function normalizePosts(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizePost).filter((post) => post !== null)
}
