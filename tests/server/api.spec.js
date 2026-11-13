// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../server/app.js'
import { createMemoryStore } from '../../server/store.js'

const FIXED_NOW = 1_700_000_000_000

let app
let store

beforeEach(() => {
  store = createMemoryStore({ now: () => FIXED_NOW })
  app = createApp({ store })
})

function jsonRequest(path, { method = 'GET', body } = {}) {
  return app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

describe('GET /api/health', () => {
  it('返回健康状态', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})

describe('GET /api/posts', () => {
  it('返回预置推送并按时间倒序', async () => {
    const res = await app.request('/api/posts')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')

    const data = await res.json()
    expect(data.posts).toHaveLength(3)
    expect(data.posts[0].title).toBe('推送已迁移到服务端')
    expect(data.posts.map((post) => post.time)).toEqual(
      [...data.posts.map((post) => post.time)].sort((a, b) => b - a)
    )
  })
})

describe('POST /api/posts', () => {
  it('创建成功后返回 201 与完整条目', async () => {
    const res = await jsonRequest('/api/posts', {
      method: 'POST',
      body: { title: '  新推送  ', body: '  新正文  ' }
    })

    expect(res.status).toBe(201)
    const { post } = await res.json()
    expect(post).toMatchObject({
      title: '新推送',
      body: '新正文',
      time: FIXED_NOW,
      likes: 0,
      liked: false
    })

    const list = await (await app.request('/api/posts')).json()
    expect(list.posts[0].id).toBe(post.id)
  })

  it('都为空时返回 400 与提示', async () => {
    const res = await jsonRequest('/api/posts', { method: 'POST', body: { title: '', body: ' ' } })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: '标题和正文不能都为空哦～' })
  })

  it('缺少标题或正文时返回对应提示', async () => {
    const noTitle = await jsonRequest('/api/posts', { method: 'POST', body: { body: '正文' } })
    expect(noTitle.status).toBe(400)
    expect(await noTitle.json()).toEqual({ message: '请填写标题' })

    const noBody = await jsonRequest('/api/posts', { method: 'POST', body: { title: '标题' } })
    expect(noBody.status).toBe(400)
    expect(await noBody.json()).toEqual({ message: '请填写正文内容' })
  })

  it('超长内容会被截断到上限', async () => {
    const res = await jsonRequest('/api/posts', {
      method: 'POST',
      body: { title: 't'.repeat(80), body: 'b'.repeat(1200) }
    })
    expect(res.status).toBe(201)
    const { post } = await res.json()
    expect(post.title).toHaveLength(60)
    expect(post.body).toHaveLength(1000)
  })

  it('非法 JSON 返回 400 而不崩溃', async () => {
    const res = await app.request('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title":'
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: '请求体不是合法的 JSON' })
  })
})

describe('PUT /api/posts/:id', () => {
  it('更新成功并保留点赞数', async () => {
    const created = (await (
      await jsonRequest('/api/posts', { method: 'POST', body: { title: '原标题', body: '原正文' } })
    ).json()).post
    await jsonRequest(`/api/posts/${created.id}/like`, { method: 'PUT', body: { liked: true } })

    const res = await jsonRequest(`/api/posts/${created.id}`, {
      method: 'PUT',
      body: { title: '新标题', body: '新正文' }
    })

    expect(res.status).toBe(200)
    const { post } = await res.json()
    expect(post).toMatchObject({
      id: created.id,
      title: '新标题',
      body: '新正文',
      likes: 1,
      liked: true
    })
    expect(post.time).toBe(FIXED_NOW)
  })

  it('校验失败返回 400 且不修改数据', async () => {
    const res = await jsonRequest('/api/posts/1', { method: 'PUT', body: { title: '', body: '' } })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: '标题和正文不能都为空哦～' })
    expect(store.get(1).title).toBe('欢迎来到小晶推送馆')
  })

  it('未知 id 返回 404', async () => {
    const res = await jsonRequest('/api/posts/999999', {
      method: 'PUT',
      body: { title: '标题', body: '正文' }
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '该推送已不存在' })
  })

  it('非法 id 返回 400', async () => {
    const res = await jsonRequest('/api/posts/abc', {
      method: 'PUT',
      body: { title: '标题', body: '正文' }
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: '推送 id 不合法' })
  })
})

describe('PUT /api/posts/:id/like', () => {
  it('点赞与取消点赞幂等更新计数', async () => {
    const first = await jsonRequest('/api/posts/1/like', { method: 'PUT', body: { liked: true } })
    expect(first.status).toBe(200)
    expect((await first.json()).post).toMatchObject({ likes: 1, liked: true })

    const again = await jsonRequest('/api/posts/1/like', { method: 'PUT', body: { liked: true } })
    expect((await again.json()).post).toMatchObject({ likes: 1, liked: true })

    const cancel = await jsonRequest('/api/posts/1/like', { method: 'PUT', body: { liked: false } })
    expect((await cancel.json()).post).toMatchObject({ likes: 0, liked: false })
  })

  it('liked 非布尔值返回 400', async () => {
    const res = await jsonRequest('/api/posts/1/like', { method: 'PUT', body: { liked: 'yes' } })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: '参数 liked 必须是布尔值' })
  })

  it('未知 id 返回 404', async () => {
    const res = await jsonRequest('/api/posts/999999/like', {
      method: 'PUT',
      body: { liked: true }
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/posts/:id', () => {
  it('删除成功返回 204 且列表同步', async () => {
    const res = await app.request('/api/posts/1', { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')

    const list = await (await app.request('/api/posts')).json()
    expect(list.posts).toHaveLength(2)
    expect(list.posts.some((post) => post.id === 1)).toBe(false)
  })

  it('未知 id 返回 404 JSON', async () => {
    const res = await app.request('/api/posts/999999', { method: 'DELETE' })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '该推送已不存在' })
  })
})

describe('未知接口', () => {
  it('/api/* 未匹配时返回 JSON 404', async () => {
    const res = await app.request('/api/unknown')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ message: '接口不存在' })
  })
})
