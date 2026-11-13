import { describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  isStorageAvailable,
  normalizePosts,
  readPosts,
  writePosts
} from '../../src/services/postStorage.js'

function createMemoryStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    _dump: () => map
  }
}

function createBrokenStorage() {
  return {
    getItem() {
      throw new Error('storage denied')
    },
    setItem() {
      const error = new Error('quota exceeded')
      error.name = 'QuotaExceededError'
      throw error
    },
    removeItem() {
      throw new Error('storage denied')
    }
  }
}

describe('STORAGE_KEY', () => {
  it('沿用 v1.x 的键名以兼容旧数据', () => {
    expect(STORAGE_KEY).toBe('xjjg_posts')
  })
})

describe('normalizePosts', () => {
  it('补齐 likes 与 liked 字段（兼容 v1.0 数据）', () => {
    const result = normalizePosts([
      { id: 1, title: '旧标题', body: '旧正文', time: 1000 }
    ])
    expect(result).toEqual([
      { id: 1, title: '旧标题', body: '旧正文', time: 1000, likes: 0, liked: false }
    ])
  })

  it('过滤掉非法条目', () => {
    const result = normalizePosts([
      null,
      'string',
      { id: '1', title: 'bad id' },
      { title: 'missing id' },
      { id: 2, title: 'ok', body: 'ok', time: 1000, likes: 3, liked: true }
    ])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('截断超长标题与正文', () => {
    const result = normalizePosts([
      { id: 1, title: 'a'.repeat(80), body: 'b'.repeat(1200), time: 1000 }
    ])
    expect(result[0].title).toHaveLength(60)
    expect(result[0].body).toHaveLength(1000)
  })

  it('修正非法 likes / liked / time', () => {
    const result = normalizePosts([
      { id: 1, title: 't', body: 'b', time: 'bad', likes: -5, liked: 'yes' }
    ])
    expect(result[0].likes).toBe(0)
    expect(result[0].liked).toBe(false)
    expect(typeof result[0].time).toBe('number')
    expect(Number.isNaN(result[0].time)).toBe(false)
  })

  it('非数组输入返回空数组', () => {
    expect(normalizePosts(undefined)).toEqual([])
    expect(normalizePosts(null)).toEqual([])
    expect(normalizePosts({ id: 1 })).toEqual([])
  })
})

describe('readPosts', () => {
  it('未存储时返回空数组', () => {
    expect(readPosts(createMemoryStorage())).toEqual([])
  })

  it('读取并归一化已存储的数据', () => {
    const storage = createMemoryStorage()
    storage.setItem(STORAGE_KEY, JSON.stringify([{ id: 7, title: 'a', body: 'b', time: 1000 }]))
    expect(readPosts(storage)).toEqual([
      { id: 7, title: 'a', body: 'b', time: 1000, likes: 0, liked: false }
    ])
  })

  it('非法 JSON 或非数组内容返回空数组', () => {
    const broken = createMemoryStorage()
    broken.setItem(STORAGE_KEY, '{not json')
    expect(readPosts(broken)).toEqual([])

    const wrongShape = createMemoryStorage()
    wrongShape.setItem(STORAGE_KEY, JSON.stringify({ id: 1 }))
    expect(readPosts(wrongShape)).toEqual([])
  })

  it('存储读取异常时降级为空数组而不抛出', () => {
    expect(readPosts(createBrokenStorage())).toEqual([])
  })
})

describe('writePosts', () => {
  it('写入成功返回 ok: true 并持久化数据', () => {
    const storage = createMemoryStorage()
    const posts = [{ id: 1, title: '标题', body: '正文', time: 1000, likes: 0, liked: false }]
    expect(writePosts(posts, storage)).toEqual({ ok: true })
    expect(JSON.parse(storage.getItem(STORAGE_KEY))).toEqual(posts)
  })

  it('未显式传入 storage 时使用 window.localStorage', () => {
    const posts = [{ id: 2, title: '标题', body: '正文', time: 1000, likes: 0, liked: false }]
    expect(writePosts(posts)).toEqual({ ok: true })
    expect(readPosts()).toEqual(posts)
  })

  it('写入失败返回 ok: false 与错误信息，不抛出异常', () => {
    const result = writePosts([], createBrokenStorage())
    expect(result.ok).toBe(false)
    expect(typeof result.error).toBe('string')
    expect(result.error.length).toBeGreaterThan(0)
  })
})

describe('isStorageAvailable', () => {
  it('可用存储返回 true', () => {
    expect(isStorageAvailable(createMemoryStorage())).toBe(true)
  })

  it('不可用存储返回 false', () => {
    expect(isStorageAvailable(createBrokenStorage())).toBe(false)
    expect(isStorageAvailable(null)).toBe(false)
  })
})
