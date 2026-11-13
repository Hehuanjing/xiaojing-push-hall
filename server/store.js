/**
 * 进程内内存仓储：无文件、无数据库，重启即恢复为预置数据。
 * 所有读写都返回副本，避免外部修改绕过仓储逻辑。
 */

const DAY = 24 * 60 * 60 * 1000

/** 预置示例推送：时间基于启动时刻，保证列表顺序稳定可读 */
export function createDefaultSeed(now = Date.now()) {
  return [
    {
      id: 3,
      title: '推送已迁移到服务端',
      body: '数据现在由 Hono + 内存存储统一维护，刷新页面不会再丢；服务停止后重启会恢复示例数据。',
      time: now - 60 * 1000,
      likes: 3,
      liked: false
    },
    {
      id: 2,
      title: '今日热搜联动',
      body: '点一下热搜标题会自动预填到发布框，顺手写下你的看法，发布后立刻出现在左侧列表。',
      time: now - 3 * 60 * 60 * 1000,
      likes: 1,
      liked: false
    },
    {
      id: 1,
      title: '欢迎来到小晶推送馆',
      body: '发布、搜索、编辑、点赞、删除都在这里完成，搜「迁移」试试看。',
      time: now - DAY,
      likes: 0,
      liked: false
    }
  ]
}

function clone(post) {
  return post ? { ...post } : null
}

/**
 * @param {{ seed?: () => Array, now?: () => number }} options
 * seed 传函数以便 reset 时重新生成时间戳
 */
export function createMemoryStore({ seed, now = () => Date.now() } = {}) {
  const createSeed = seed || (() => createDefaultSeed(now()))
  const posts = new Map()
  let idSeq = 0

  function loadSeed() {
    posts.clear()
    idSeq = 0
    for (const raw of createSeed()) {
      const post = {
        id: raw.id,
        title: raw.title,
        body: raw.body,
        time: raw.time,
        likes: Number.isFinite(raw.likes) ? raw.likes : 0,
        liked: raw.liked === true
      }
      posts.set(post.id, post)
    }
  }

  loadSeed()

  function sorted() {
    return [...posts.values()].sort((a, b) => b.time - a.time || b.id - a.id)
  }

  function nextId() {
    idSeq += 1
    let id = now() * 1000 + idSeq
    while (posts.has(id)) {
      idSeq += 1
      id = now() * 1000 + idSeq
    }
    return id
  }

  return {
    list() {
      return sorted().map(clone)
    },

    get(id) {
      return clone(posts.get(id))
    },

    create({ title, body }) {
      const post = {
        id: nextId(),
        title,
        body,
        time: now(),
        likes: 0,
        liked: false
      }
      posts.set(post.id, post)
      return clone(post)
    },

    update(id, { title, body }) {
      const post = posts.get(id)
      if (!post) return null

      post.title = title
      post.body = body
      post.time = now()
      return clone(post)
    },

    /** 幂等设置点赞状态，避免重复点击导致计数漂移 */
    setLiked(id, liked) {
      const post = posts.get(id)
      if (!post) return null

      const next = liked === true
      if (post.liked !== next) {
        post.liked = next
        post.likes = Math.max(0, post.likes + (next ? 1 : -1))
      }
      return clone(post)
    },

    remove(id) {
      return posts.delete(id)
    },

    reset() {
      loadSeed()
    },

    get size() {
      return posts.size
    }
  }
}
