import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { STORAGE_KEY } from '../../src/services/postStorage.js'
import { usePostsStore } from '../../src/stores/posts.js'

function createMemoryStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    read: () => JSON.parse(map.get(STORAGE_KEY) || '[]')
  }
}

function createBrokenStorage() {
  return {
    getItem() {
      throw new Error('storage denied')
    },
    setItem() {
      throw new Error('quota exceeded')
    },
    removeItem() {
      throw new Error('storage denied')
    }
  }
}

function seed(storage, list) {
  storage.setItem(STORAGE_KEY, JSON.stringify(list))
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('初始状态', () => {
  it('默认无推送、无搜索词、无编辑态', () => {
    const store = usePostsStore()
    expect(store.posts).toEqual([])
    expect(store.keyword).toBe('')
    expect(store.editingId).toBeNull()
    expect(store.lastError).toBe('')
    expect(store.counts).toEqual({ total: 0, matched: 0, isFiltering: false })
  })
})

describe('load', () => {
  it('读取并归一化本地数据（兼容缺少 likes 的旧记录）', () => {
    const storage = createMemoryStorage()
    seed(storage, [
      { id: 1, title: '旧记录', body: '正文', time: 1000 },
      { id: 2, title: '新记录', body: '正文', time: 2000, likes: 2, liked: true }
    ])
    const store = usePostsStore()
    store.load(storage)
    expect(store.posts).toHaveLength(2)
    expect(store.posts[0]).toMatchObject({ id: 1, likes: 0, liked: false })
    expect(store.posts[1]).toMatchObject({ id: 2, likes: 2, liked: true })
  })

  it('存储不可用时标记错误但不抛异常', () => {
    const store = usePostsStore()
    store.load(createBrokenStorage())
    expect(store.posts).toEqual([])
    expect(store.lastError.length).toBeGreaterThan(0)
  })
})

describe('publish', () => {
  it('标题与正文都为空时提示', () => {
    const store = usePostsStore()
    const storage = createMemoryStorage()
    store.load(storage)
    const result = store.publish({ title: '  ', body: '  ' })
    expect(result).toEqual({ ok: false, message: '标题和正文不能都为空哦～' })
    expect(store.posts).toEqual([])
  })

  it('缺少标题或正文时分别提示', () => {
    const store = usePostsStore()
    expect(store.publish({ title: '', body: '正文' }).message).toBe('请填写标题')
    expect(store.publish({ title: '标题', body: '' }).message).toBe('请填写正文内容')
  })

  it('发布成功后置顶并写入存储', () => {
    const store = usePostsStore()
    const storage = createMemoryStorage()
    store.load(storage)

    const result = store.publish({ title: '第一条', body: '正文一' })
    expect(result).toEqual({ ok: true, message: '发布成功 ✓ 已保存到本地' })
    expect(store.posts).toHaveLength(1)

    store.publish({ title: '第二条', body: '正文二' })
    expect(store.sortedPosts[0].title).toBe('第二条')
    expect(storage.read().map((post) => post.title)).toEqual(['第一条', '第二条'])
    expect(storage.read()[0]).toMatchObject({ likes: 0, liked: false })
  })

  it('连续发布生成不同 id', () => {
    const store = usePostsStore()
    store.publish({ title: 'A', body: 'a' })
    store.publish({ title: 'B', body: 'b' })
    expect(new Set(store.posts.map((post) => post.id)).size).toBe(2)
  })

  it('写入失败时保留内存数据并记录错误', () => {
    const store = usePostsStore()
    store.load(createBrokenStorage())
    const result = store.publish({ title: '标题', body: '正文' })
    expect(result.ok).toBe(true)
    expect(store.posts).toHaveLength(1)
    expect(store.lastError.length).toBeGreaterThan(0)
  })
})

describe('搜索', () => {
  it('按标题与正文过滤并给出计数', () => {
    const store = usePostsStore()
    store.publish({ title: '前端调试记录', body: 'localStorage 持久化验证' })
    store.publish({ title: '周末马拉松', body: '报名了志愿者' })

    store.setKeyword('持久化')
    expect(store.filteredPosts).toHaveLength(1)
    expect(store.counts).toEqual({ total: 2, matched: 1, isFiltering: true })

    store.setKeyword('马拉松')
    expect(store.filteredPosts[0].title).toBe('周末马拉松')

    store.setKeyword('')
    expect(store.filteredPosts).toHaveLength(2)
    expect(store.counts).toEqual({ total: 2, matched: 2, isFiltering: false })
  })

  it('忽略大小写与首尾空格', () => {
    const store = usePostsStore()
    store.publish({ title: 'Vue 3 迁移', body: 'Pinia 状态管理' })
    store.setKeyword('  vue ')
    expect(store.filteredPosts).toHaveLength(1)
  })
})

describe('编辑', () => {
  it('startEdit 记录编辑目标并可取回条目', () => {
    const store = usePostsStore()
    store.publish({ title: '原标题', body: '原正文' })
    const id = store.posts[0].id

    store.startEdit(id)
    expect(store.editingId).toBe(id)
    expect(store.editingPost.title).toBe('原标题')
  })

  it('updateEditing 更新原条目且不新增，保留点赞数', () => {
    const store = usePostsStore()
    const storage = createMemoryStorage()
    store.load(storage)
    store.publish({ title: '原标题', body: '原正文' })
    const id = store.posts[0].id
    store.toggleLike(id)

    store.startEdit(id)
    const result = store.updateEditing({ title: '新标题', body: '新正文' })

    expect(result).toEqual({ ok: true, message: '修改已保存 ✓' })
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]).toMatchObject({ id, title: '新标题', body: '新正文', likes: 1, liked: true })
    expect(store.editingId).toBeNull()
    expect(storage.read()[0].title).toBe('新标题')
  })

  it('updateEditing 校验失败时不修改数据并保持编辑态', () => {
    const store = usePostsStore()
    store.publish({ title: '原标题', body: '原正文' })
    const id = store.posts[0].id
    store.startEdit(id)

    const result = store.updateEditing({ title: '', body: '' })
    expect(result.ok).toBe(false)
    expect(store.posts[0].title).toBe('原标题')
    expect(store.editingId).toBe(id)
  })

  it('cancelEdit 退出编辑态', () => {
    const store = usePostsStore()
    store.publish({ title: '标题', body: '正文' })
    store.startEdit(store.posts[0].id)
    store.cancelEdit()
    expect(store.editingId).toBeNull()
  })
})

describe('点赞', () => {
  it('点赞与取消点赞往返，并写入存储', () => {
    const store = usePostsStore()
    const storage = createMemoryStorage()
    store.load(storage)
    store.publish({ title: '标题', body: '正文' })
    const id = store.posts[0].id

    store.toggleLike(id)
    expect(store.posts[0]).toMatchObject({ likes: 1, liked: true })
    expect(storage.read()[0]).toMatchObject({ likes: 1, liked: true })

    store.toggleLike(id)
    expect(store.posts[0]).toMatchObject({ likes: 0, liked: false })
  })

  it('未知 id 不产生副作用', () => {
    const store = usePostsStore()
    store.toggleLike(999)
    expect(store.posts).toEqual([])
  })
})

describe('删除', () => {
  it('删除条目并写入存储', () => {
    const store = usePostsStore()
    const storage = createMemoryStorage()
    store.load(storage)
    store.publish({ title: 'A', body: 'a' })
    store.publish({ title: 'B', body: 'b' })
    const id = store.posts[0].id

    store.remove(id)
    expect(store.posts).toHaveLength(1)
    expect(storage.read()).toHaveLength(1)
  })

  it('删除正在编辑的条目会退出编辑态', () => {
    const store = usePostsStore()
    store.publish({ title: '标题', body: '正文' })
    const id = store.posts[0].id
    store.startEdit(id)
    store.remove(id)
    expect(store.editingId).toBeNull()
  })
})

describe('错误提示', () => {
  it('clearError 可清空提示', () => {
    const store = usePostsStore()
    store.load(createBrokenStorage())
    expect(store.lastError.length).toBeGreaterThan(0)
    store.clearError()
    expect(store.lastError).toBe('')
  })
})
