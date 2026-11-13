export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const DEFAULT_BASE_URL = '/api'
export const DEFAULT_TIMEOUT = 8000

/**
 * 推送 REST 客户端。fetchImpl 可注入，便于测试；默认使用全局 fetch。
 * timeout 用于避免服务端挂起时 UI 永久等待（超时按网络不可用处理）。
 */
export function createPostsApi({ fetchImpl, baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT } = {}) {
  const doFetch = fetchImpl || ((input, init) => globalThis.fetch(input, init))

  async function request(path, { method = 'GET', body } = {}) {
    const options = { method, headers: { Accept: 'application/json' } }
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }
    if (timeout > 0 && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      options.signal = AbortSignal.timeout(timeout)
    }

    let response
    try {
      response = await doFetch(`${baseUrl}${path}`, options)
    } catch {
      // 网络层失败统一映射为 status 0，交由 store 决定是否降级
      throw new ApiError('无法连接服务端', 0)
    }

    if (response.status === 204) return null

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      const message =
        data && typeof data.message === 'string' ? data.message : `请求失败（${response.status}）`
      throw new ApiError(message, response.status)
    }

    return data
  }

  return {
    baseUrl,

    async list() {
      const data = await request('/posts')
      // 响应格式异常（如网关/SPA fallback 返回 HTML）时抛错，交由 store 回落缓存
      if (!data || !Array.isArray(data.posts)) {
        throw new ApiError('服务端响应格式异常', 502)
      }
      return data.posts
    },

    async create(payload) {
      const data = await request('/posts', { method: 'POST', body: payload })
      return data?.post ?? null
    },

    async update(id, payload) {
      const data = await request(`/posts/${id}`, { method: 'PUT', body: payload })
      return data?.post ?? null
    },

    async like(id, liked) {
      const data = await request(`/posts/${id}/like`, { method: 'PUT', body: { liked } })
      return data?.post ?? null
    },

    async remove(id) {
      return request(`/posts/${id}`, { method: 'DELETE' })
    }
  }
}
