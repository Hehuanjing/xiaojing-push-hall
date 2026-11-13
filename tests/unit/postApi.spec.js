import { describe, expect, it } from 'vitest'
import { ApiError, createPostsApi } from '../../src/services/postApi.js'

function jsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }
}

function setup(response) {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    if (response instanceof Error) throw response
    return response
  }
  return { api: createPostsApi({ fetchImpl }), calls }
}

describe('createPostsApi', () => {
  it('list 请求 GET /api/posts 并返回 posts 数组', async () => {
    const { api, calls } = setup(jsonResponse({ posts: [{ id: 1, title: '标题' }] }))

    await expect(api.list()).resolves.toEqual([{ id: 1, title: '标题' }])
    expect(calls[0].url).toBe('/api/posts')
    expect(calls[0].options.method).toBe('GET')
  })

  it('list 响应格式异常时抛错，避免误清空本地缓存', async () => {
    const { api } = setup(jsonResponse({}))
    const error = await api.list().catch((err) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(502)

    const html = createPostsApi({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <')
        }
      })
    })
    await expect(html.list()).rejects.toMatchObject({ status: 502 })
  })

  it('create 以 JSON 提交并返回新条目', async () => {
    const { api, calls } = setup(jsonResponse({ post: { id: 9, title: '标题' } }, { status: 201 }))

    const post = await api.create({ title: '标题', body: '正文' })

    expect(post).toEqual({ id: 9, title: '标题' })
    expect(calls[0].url).toBe('/api/posts')
    expect(calls[0].options.method).toBe('POST')
    expect(calls[0].options.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(calls[0].options.body)).toEqual({ title: '标题', body: '正文' })
  })

  it('update 使用 PUT /api/posts/:id', async () => {
    const { api, calls } = setup(jsonResponse({ post: { id: 5, title: '新标题' } }))

    const post = await api.update(5, { title: '新标题', body: '新正文' })

    expect(post).toEqual({ id: 5, title: '新标题' })
    expect(calls[0].url).toBe('/api/posts/5')
    expect(calls[0].options.method).toBe('PUT')
    expect(JSON.parse(calls[0].options.body)).toEqual({ title: '新标题', body: '新正文' })
  })

  it('like 使用 PUT /api/posts/:id/like 并提交 liked', async () => {
    const { api, calls } = setup(jsonResponse({ post: { id: 5, likes: 1, liked: true } }))

    const post = await api.like(5, true)

    expect(post).toMatchObject({ likes: 1, liked: true })
    expect(calls[0].url).toBe('/api/posts/5/like')
    expect(calls[0].options.method).toBe('PUT')
    expect(JSON.parse(calls[0].options.body)).toEqual({ liked: true })
  })

  it('remove 使用 DELETE，204 时返回 null', async () => {
    const { api, calls } = setup({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('204 无响应体')
      }
    })

    await expect(api.remove(5)).resolves.toBeNull()
    expect(calls[0].url).toBe('/api/posts/5')
    expect(calls[0].options.method).toBe('DELETE')
  })

  it('请求附带超时信号，避免后端挂起时无限等待', async () => {
    const { api, calls } = setup(jsonResponse({ posts: [] }))
    await api.list()
    expect(calls[0].options.signal).toBeInstanceOf(AbortSignal)
  })

  it('非 2xx 抛出携带状态码与服务端文案的 ApiError', async () => {
    const { api } = setup(jsonResponse({ message: '该推送已不存在' }, { status: 404 }))

    const error = await api.remove(5).catch((err) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
    expect(error.message).toBe('该推送已不存在')
  })

  it('错误响应缺少 message 时返回兜底文案', async () => {
    const { api } = setup(jsonResponse(null, { status: 500 }))

    const error = await api.list().catch((err) => err)
    expect(error.status).toBe(500)
    expect(error.message).toBe('请求失败（500）')
  })

  it('网络异常映射为 status 0 的 ApiError', async () => {
    const { api } = setup(new TypeError('Failed to fetch'))

    const error = await api.list().catch((err) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toBe('无法连接服务端')
  })

  it('支持自定义 baseUrl', async () => {
    const calls = []
    const api = createPostsApi({
      baseUrl: 'http://localhost:8787/api',
      fetchImpl: async (url) => {
        calls.push(url)
        return jsonResponse({ posts: [] })
      }
    })

    await api.list()
    expect(calls[0]).toBe('http://localhost:8787/api/posts')
  })
})
