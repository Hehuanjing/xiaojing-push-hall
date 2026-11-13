import { Hono } from 'hono'
import { validatePostInput } from '../shared/postSchema.js'

const MESSAGE = {
  notFound: '该推送已不存在',
  invalidId: '推送 id 不合法',
  invalidJson: '请求体不是合法的 JSON',
  invalidLiked: '参数 liked 必须是布尔值',
  unknownRoute: '接口不存在',
  serverError: '服务器内部错误'
}

/** 只接受纯数字且处于安全整数范围内的 id */
function parseId(raw) {
  if (!/^\d+$/.test(raw ?? '')) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

async function readJson(c) {
  try {
    return { ok: true, value: await c.req.json() }
  } catch {
    return { ok: false, message: MESSAGE.invalidJson }
  }
}

/**
 * 组装 REST API。只挂 /api/*，便于用 app.request() 直接测试。
 * @param {{ store: ReturnType<import('./store.js').createMemoryStore> }} deps
 */
export function createApp({ store }) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))

  app.get('/api/posts', (c) => c.json({ posts: store.list() }))

  app.post('/api/posts', async (c) => {
    const parsed = await readJson(c)
    if (!parsed.ok) return c.json({ message: parsed.message }, 400)

    const checked = validatePostInput(parsed.value)
    if (!checked.ok) return c.json({ message: checked.message }, 400)

    const post = store.create({ title: checked.title, body: checked.body })
    return c.json({ post }, 201)
  })

  app.put('/api/posts/:id', async (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return c.json({ message: MESSAGE.invalidId }, 400)

    const parsed = await readJson(c)
    if (!parsed.ok) return c.json({ message: parsed.message }, 400)

    const checked = validatePostInput(parsed.value)
    if (!checked.ok) return c.json({ message: checked.message }, 400)

    const post = store.update(id, { title: checked.title, body: checked.body })
    if (!post) return c.json({ message: MESSAGE.notFound }, 404)

    return c.json({ post })
  })

  app.put('/api/posts/:id/like', async (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return c.json({ message: MESSAGE.invalidId }, 400)

    const parsed = await readJson(c)
    if (!parsed.ok) return c.json({ message: parsed.message }, 400)

    const liked = parsed.value?.liked
    if (typeof liked !== 'boolean') return c.json({ message: MESSAGE.invalidLiked }, 400)

    const post = store.setLiked(id, liked)
    if (!post) return c.json({ message: MESSAGE.notFound }, 404)

    return c.json({ post })
  })

  app.delete('/api/posts/:id', (c) => {
    const id = parseId(c.req.param('id'))
    if (id === null) return c.json({ message: MESSAGE.invalidId }, 400)
    if (!store.remove(id)) return c.json({ message: MESSAGE.notFound }, 404)

    return c.body(null, 204)
  })

  // 未匹配的 /api 与 /api/* 保持 JSON 404，避免被 SPA fallback 吃掉
  app.all('/api', (c) => c.json({ message: MESSAGE.unknownRoute }, 404))
  app.all('/api/*', (c) => c.json({ message: MESSAGE.unknownRoute }, 404))

  app.onError((error, c) => {
    console.error('[api] 未处理异常:', error?.message || error)
    return c.json({ message: MESSAGE.serverError }, 500)
  })

  return app
}
