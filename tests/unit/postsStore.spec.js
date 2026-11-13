import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '../../src/services/postApi.js'
import { STORAGE_KEY } from '../../src/services/postStorage.js'
import { usePostsStore } from '../../src/stores/posts.js'

function createFakeApi(overrides = {}) {
  let seq = 0
  const api = {
    list: vi.fn(async () => []),
    create: vi.fn(async ({ title, body }) => ({
      id: 1000 + ++seq,
      title,
      body,
      time: 5000 + seq,
      likes: 0,
      liked: false
    })),
    update: vi.fn(async (id, { title, body }) => ({
      id,
      title,
      body,
      time: 6000,
      likes: 0,
      liked: false
    })),
    like: vi.fn(async (id, liked) => ({
      id,
      title: '标题',
      body: '正文',
      time: 7000,
      likes: liked ? 1 : 0,
      liked
    })),
    remove: vi.fn(async () => null),
    ...overrides
  }
  return api
}

function setupStore(api = createFakeApi()) {
  setActivePinia(createPinia())
  const store = usePostsStore()
  store.configure({ api })
  return { store, api }
}

function cachePosts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function readCache() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
}

function networkError() {
  return new ApiError('无法连接服务端', 0)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('初始状态', () => {
  it('默认无推送、无搜索词、无编辑态，默认视服务端为可用', () => {
    const store = usePostsStore()
    expect(store.posts).toEqual([])
    expect(store.keyword).toBe('')
    expect(store.editingId).toBeNull()
    expect(store.lastError).toBe('')
    expect(store.apiAvailable).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.counts).toEqual({ total: 0, matched: 0, isFiltering: false })
  })
})

describe('load', () => {
  it('在线时以服务端数据为准并写入本地缓存', async () => {
    const api = createFakeApi({
      list: vi.fn(async () => [
        { id: 1, title: '旧记录', body: '正文', time: 1000 },
        { id: 2, title: '新记录', body: '正文', time: 2000, likes: 2, liked: true }
      ])
    })
    const { store } = setupStore(api)

    await store.load()

    expect(store.posts).toHaveLength(2)
    expect(store.posts[0]).toMatchObject({ id: 1, likes: 0, liked: false })
    expect(store.posts[1]).toMatchObject({ id: 2, likes: 2, liked: true })
    expect(store.apiAvailable).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.lastError).toBe('')
    expect(readCache()).toHaveLength(2)
  })

  it('服务端不可用时回落到本地缓存且不覆盖缓存', async () => {
    cachePosts([{ id: 9, title: '缓存条目', body: '正文', time: 1000, likes: 1, liked: true }])
    const api = createFakeApi({
      list: vi.fn(async () => {
        throw networkError()
      })
    })
    const { store } = setupStore(api)

    await store.load()

    expect(store.posts).toEqual([
      { id: 9, title: '缓存条目', body: '正文', time: 1000, likes: 1, liked: true }
    ])
    expect(store.apiAvailable).toBe(false)
    expect(store.lastError).toBe('服务端暂不可用，已切换到本地缓存模式')
    expect(readCache()).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it('服务端 5xx 同样视为不可用', async () => {
    const api = createFakeApi({
      list: vi.fn(async () => {
        throw new ApiError('服务器内部错误', 500)
      })
    })
    const { store } = setupStore(api)

    await store.load()

    expect(store.apiAvailable).toBe(false)
    expect(store.posts).toEqual([])
  })
})

describe('publish', () => {
  it('标题与正文都为空时提示且不请求服务端', async () => {
    const { store, api } = setupStore()
    const result = await store.publish({ title: '  ', body: '  ' })

    expect(result).toEqual({ ok: false, message: '标题和正文不能都为空哦～' })
    expect(api.create).not.toHaveBeenCalled()
    expect(store.posts).toEqual([])
  })

  it('缺少标题或正文时分别提示', async () => {
    const { store } = setupStore()
    await expect(store.publish({ title: '', body: '正文' })).resolves.toEqual({
      ok: false,
      message: '请填写标题'
    })
    await expect(store.publish({ title: '标题', body: '' })).resolves.toEqual({
      ok: false,
      message: '请填写正文内容'
    })
  })

  it('在线发布成功后置顶、写缓存并返回同步文案', async () => {
    const { store, api } = setupStore()

    const result = await store.publish({ title: '  第一条  ', body: '  正文一  ' })

    expect(result).toEqual({ ok: true, message: '发布成功 ✓ 已同步到服务端' })
    expect(api.create).toHaveBeenCalledWith({ title: '第一条', body: '正文一' })
    expect(store.posts).toHaveLength(1)
    expect(store.sortedPosts[0].title).toBe('第一条')
    expect(store.apiAvailable).toBe(true)
    expect(readCache()[0]).toMatchObject({ title: '第一条', likes: 0, liked: false })
  })

  it('连续发布生成不同 id', async () => {
    const { store } = setupStore()
    await store.publish({ title: 'A', body: 'a' })
    await store.publish({ title: 'B', body: 'b' })
    expect(new Set(store.posts.map((post) => post.id)).size).toBe(2)
  })

  it('服务端不可用时本地保留并写缓存', async () => {
    const api = createFakeApi({
      create: vi.fn(async () => {
        throw networkError()
      })
    })
    const { store } = setupStore(api)

    const result = await store.publish({ title: '离线标题', body: '离线正文' })

    expect(result).toEqual({ ok: true, message: '发布成功 ✓ 已暂存到本地缓存' })
    expect(store.posts).toHaveLength(1)
    expect(store.apiAvailable).toBe(false)
    expect(store.lastError).toBe('服务端暂不可用，已切换到本地缓存模式')
    expect(readCache()[0].title).toBe('离线标题')
  })

  it('离线发布但缓存写入失败时提示刷新会丢失', async () => {
    const api = createFakeApi({
      create: vi.fn(async () => {
        throw networkError()
      })
    })
    const { store } = setupStore(api)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const result = await store.publish({ title: '离线标题', body: '离线正文' })

    expect(result).toEqual({ ok: true, message: '已保存，但本地缓存不可用，刷新后会丢失' })
    expect(store.posts).toHaveLength(1)
  })

  it('服务端 4xx 时返回错误且不落地数据', async () => {
    const api = createFakeApi({
      create: vi.fn(async () => {
        throw new ApiError('标题重复', 400)
      })
    })
    const { store } = setupStore(api)

    const result = await store.publish({ title: '标题', body: '正文' })

    expect(result).toEqual({ ok: false, message: '标题重复' })
    expect(store.posts).toEqual([])
    expect(store.apiAvailable).toBe(true)
    expect(readCache()).toEqual([])
  })
})

describe('搜索', () => {
  it('按标题与正文过滤并给出计数', async () => {
    const { store } = setupStore()
    await store.publish({ title: '前端调试记录', body: '缓存持久化验证' })
    await store.publish({ title: '周末马拉松', body: '报名了志愿者' })

    store.setKeyword('持久化')
    expect(store.filteredPosts).toHaveLength(1)
    expect(store.counts).toEqual({ total: 2, matched: 1, isFiltering: true })

    store.setKeyword('马拉松')
    expect(store.filteredPosts[0].title).toBe('周末马拉松')

    store.setKeyword('')
    expect(store.filteredPosts).toHaveLength(2)
    expect(store.counts).toEqual({ total: 2, matched: 2, isFiltering: false })
  })

  it('忽略大小写与首尾空格', async () => {
    const { store } = setupStore()
    await store.publish({ title: 'Vue 3 迁移', body: 'Pinia 状态管理' })
    store.setKeyword('  vue ')
    expect(store.filteredPosts).toHaveLength(1)
  })
})

describe('编辑', () => {
  it('startEdit 记录编辑目标并可取回条目', async () => {
    const { store } = setupStore()
    await store.publish({ title: '原标题', body: '原正文' })
    const id = store.posts[0].id

    store.startEdit(id)
    expect(store.editingId).toBe(id)
    expect(store.editingPost.title).toBe('原标题')
  })

  it('在线保存修改时以服务端返回结果为准并退出编辑态', async () => {
    const api = createFakeApi({
      update: vi.fn(async (id, { title, body }) => ({
        id,
        title,
        body,
        time: 9000,
        likes: 1,
        liked: true
      }))
    })
    const { store } = setupStore(api)
    await store.publish({ title: '原标题', body: '原正文' })
    const id = store.posts[0].id
    store.startEdit(id)

    const result = await store.updateEditing({ title: '新标题', body: '新正文' })

    expect(result).toEqual({ ok: true, message: '修改已保存 ✓' })
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]).toMatchObject({
      id,
      title: '新标题',
      body: '新正文',
      likes: 1,
      liked: true
    })
    expect(store.editingId).toBeNull()
    expect(readCache()[0].title).toBe('新标题')
  })

  it('服务端不可用时本地更新、写缓存并提示暂存', async () => {
    const api = createFakeApi({
      update: vi.fn(async () => {
        throw networkError()
      })
    })
    const { store } = setupStore(api)
    await store.publish({ title: '原标题', body: '原正文' })
    const id = store.posts[0].id
    store.startEdit(id)

    const result = await store.updateEditing({ title: '离线标题', body: '离线正文' })

    expect(result).toEqual({ ok: true, message: '修改已保存 ✓ 已暂存到本地缓存' })
    expect(store.posts[0]).toMatchObject({ id, title: '离线标题', body: '离线正文' })
    expect(store.editingId).toBeNull()
    expect(store.apiAvailable).toBe(false)
    expect(readCache()[0].title).toBe('离线标题')
  })

  it('服务端返回 404 时提示条目已不存在并退出编辑态', async () => {
    const api = createFakeApi({
      update: vi.fn(async () => {
        throw new ApiError('该推送已不存在', 404)
      })
    })
    const { store } = setupStore(api)
    await store.publish({ title: '原标题', body: '原正文' })
    store.startEdit(store.posts[0].id)

    const result = await store.updateEditing({ title: '新标题', body: '新正文' })

    expect(result).toEqual({ ok: false, message: '该推送已不存在' })
    expect(store.posts[0].title).toBe('原标题')
    expect(store.editingId).toBeNull()
  })

  it('校验失败时不修改数据、保持编辑态且不请求服务端', async () => {
    const { store, api } = setupStore()
    await store.publish({ title: '原标题', body: '原正文' })
    const id = store.posts[0].id
    store.startEdit(id)
    api.update.mockClear()

    const result = await store.updateEditing({ title: '', body: '' })

    expect(result.ok).toBe(false)
    expect(store.posts[0].title).toBe('原标题')
    expect(store.editingId).toBe(id)
    expect(api.update).not.toHaveBeenCalled()
  })

  it('cancelEdit 退出编辑态', async () => {
    const { store } = setupStore()
    await store.publish({ title: '标题', body: '正文' })
    store.startEdit(store.posts[0].id)
    store.cancelEdit()
    expect(store.editingId).toBeNull()
  })
})

describe('点赞', () => {
  it('在线点赞与取消点赞以服务端结果为准并写缓存', async () => {
    const like = vi
      .fn()
      .mockResolvedValueOnce({ id: 1001, title: '标题', body: '正文', time: 5000, likes: 1, liked: true })
      .mockResolvedValueOnce({ id: 1001, title: '标题', body: '正文', time: 5000, likes: 0, liked: false })
    const { store } = setupStore(createFakeApi({ like }))
    await store.publish({ title: '标题', body: '正文' })
    const id = store.posts[0].id

    await store.toggleLike(id)
    expect(like).toHaveBeenLastCalledWith(id, true)
    expect(store.posts[0]).toMatchObject({ likes: 1, liked: true })
    expect(readCache()[0]).toMatchObject({ likes: 1, liked: true })

    await store.toggleLike(id)
    expect(like).toHaveBeenLastCalledWith(id, false)
    expect(store.posts[0]).toMatchObject({ likes: 0, liked: false })
  })

  it('服务端不可用时本地切换并写缓存', async () => {
    const api = createFakeApi({
      like: vi.fn(async () => {
        throw networkError()
      })
    })
    const { store } = setupStore(api)
    await store.publish({ title: '标题', body: '正文' })
    const id = store.posts[0].id

    await store.toggleLike(id)

    expect(store.posts[0]).toMatchObject({ likes: 1, liked: true })
    expect(store.apiAvailable).toBe(false)
    expect(readCache()[0]).toMatchObject({ likes: 1, liked: true })

    await store.toggleLike(id)
    expect(store.posts[0]).toMatchObject({ likes: 0, liked: false })
  })

  it('服务端 404 时保留本地条目并本地切换（离线新建的条目）', async () => {
    const api = createFakeApi({
      like: vi.fn(async () => {
        throw new ApiError('该推送已不存在', 404)
      })
    })
    const { store } = setupStore(api)
    await store.publish({ title: '标题', body: '正文' })

    const result = await store.toggleLike(store.posts[0].id)

    expect(result.ok).toBe(true)
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]).toMatchObject({ likes: 1, liked: true })
    expect(readCache()[0]).toMatchObject({ likes: 1, liked: true })
  })

  it('点赞请求在途时忽略重复点击', async () => {
    let resolveLike
    const like = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveLike = resolve
        })
    )
    const { store } = setupStore(createFakeApi({ like }))
    await store.publish({ title: '标题', body: '正文' })
    const id = store.posts[0].id

    const first = store.toggleLike(id)
    const second = await store.toggleLike(id)

    expect(second.ok).toBe(false)
    expect(like).toHaveBeenCalledTimes(1)

    resolveLike({ id, title: '标题', body: '正文', time: 1, likes: 1, liked: true })
    await first
    expect(store.posts[0]).toMatchObject({ likes: 1, liked: true })
  })

  it('未知 id 不产生副作用也不请求服务端', async () => {
    const { store, api } = setupStore()
    const result = await store.toggleLike(999)
    expect(result.ok).toBe(false)
    expect(api.like).not.toHaveBeenCalled()
    expect(store.posts).toEqual([])
  })
})

describe('删除', () => {
  it('在线删除后同步缓存', async () => {
    const { store, api } = setupStore()
    await store.publish({ title: 'A', body: 'a' })
    await store.publish({ title: 'B', body: 'b' })
    const id = store.posts[0].id

    const result = await store.remove(id)

    expect(result.ok).toBe(true)
    expect(api.remove).toHaveBeenCalledWith(id)
    expect(store.posts).toHaveLength(1)
    expect(readCache()).toHaveLength(1)
  })

  it('服务端不可用时本地删除并写缓存', async () => {
    const api = createFakeApi({
      remove: vi.fn(async () => {
        throw networkError()
      })
    })
    const { store } = setupStore(api)
    await store.publish({ title: '标题', body: '正文' })

    const result = await store.remove(store.posts[0].id)

    expect(result.ok).toBe(true)
    expect(store.posts).toEqual([])
    expect(store.apiAvailable).toBe(false)
    expect(readCache()).toEqual([])
  })

  it('服务端 404 视为已删除，继续清理本地', async () => {
    const api = createFakeApi({
      remove: vi.fn(async () => {
        throw new ApiError('该推送已不存在', 404)
      })
    })
    const { store } = setupStore(api)
    await store.publish({ title: '标题', body: '正文' })

    const result = await store.remove(store.posts[0].id)

    expect(result.ok).toBe(true)
    expect(store.posts).toEqual([])
    expect(store.apiAvailable).toBe(true)
  })

  it('删除正在编辑的条目会退出编辑态', async () => {
    const { store } = setupStore()
    await store.publish({ title: '标题', body: '正文' })
    const id = store.posts[0].id
    store.startEdit(id)
    await store.remove(id)
    expect(store.editingId).toBeNull()
  })

  it('未知 id 返回提示且不请求服务端', async () => {
    const { store, api } = setupStore()
    const result = await store.remove(123456)
    expect(result).toEqual({ ok: false, message: '该推送已不存在' })
    expect(api.remove).not.toHaveBeenCalled()
  })
})

describe('错误提示', () => {
  it('clearError 可清空提示', async () => {
    const api = createFakeApi({
      list: vi.fn(async () => {
        throw networkError()
      })
    })
    const { store } = setupStore(api)
    await store.load()
    expect(store.lastError.length).toBeGreaterThan(0)
    store.clearError()
    expect(store.lastError).toBe('')
  })
})
