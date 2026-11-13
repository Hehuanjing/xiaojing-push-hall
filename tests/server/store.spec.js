// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createMemoryStore } from '../../server/store.js'

const FIXED_NOW = 1_700_000_000_000

function createStore() {
  return createMemoryStore({ now: () => FIXED_NOW })
}

describe('预置数据', () => {
  it('启动时包含 3 条示例推送并按时间倒序返回', () => {
    const store = createStore()
    const posts = store.list()

    expect(posts).toHaveLength(3)
    expect(posts.map((post) => post.title)).toEqual([
      '推送已迁移到服务端',
      '今日热搜联动',
      '欢迎来到小晶推送馆'
    ])
    expect(posts[0].time).toBeGreaterThan(posts[1].time)
    expect(posts[1].time).toBeGreaterThan(posts[2].time)
  })

  it('种子条目包含完整字段', () => {
    const store = createStore()
    const [post] = store.list()
    expect(post).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      body: expect.any(String),
      time: expect.any(Number),
      likes: expect.any(Number),
      liked: false
    })
  })
})

describe('create', () => {
  it('新条目置顶并带有默认字段', () => {
    const store = createStore()
    const created = store.create({ title: '新推送', body: '新正文' })

    expect(created).toMatchObject({
      title: '新推送',
      body: '新正文',
      time: FIXED_NOW,
      likes: 0,
      liked: false
    })
    expect(store.list()[0].id).toBe(created.id)
    expect(store.list()).toHaveLength(4)
  })

  it('同一毫秒创建的多条记录 id 不重复', () => {
    const store = createStore()
    const ids = [
      store.create({ title: 'A', body: 'a' }).id,
      store.create({ title: 'B', body: 'b' }).id,
      store.create({ title: 'C', body: 'c' }).id
    ]
    expect(new Set(ids).size).toBe(3)
  })
})

describe('update', () => {
  it('更新标题正文并保留点赞数据', () => {
    const store = createStore()
    const created = store.create({ title: '原标题', body: '原正文' })
    store.setLiked(created.id, true)

    const updated = store.update(created.id, { title: '新标题', body: '新正文' })

    expect(updated).toMatchObject({
      id: created.id,
      title: '新标题',
      body: '新正文',
      likes: 1,
      liked: true
    })
    expect(store.list()).toHaveLength(4)
  })

  it('未知 id 返回 null', () => {
    const store = createStore()
    expect(store.update(999, { title: 'x', body: 'y' })).toBeNull()
  })
})

describe('setLiked', () => {
  it('点赞与取消点赞幂等', () => {
    const store = createStore()
    const created = store.create({ title: '标题', body: '正文' })

    expect(store.setLiked(created.id, true)).toMatchObject({ likes: 1, liked: true })
    expect(store.setLiked(created.id, true)).toMatchObject({ likes: 1, liked: true })
    expect(store.setLiked(created.id, false)).toMatchObject({ likes: 0, liked: false })
    expect(store.setLiked(created.id, false)).toMatchObject({ likes: 0, liked: false })
  })

  it('种子条目的已有赞数可继续累加', () => {
    const store = createStore()
    const seeded = store.list().find((post) => post.likes > 0)
    const result = store.setLiked(seeded.id, true)
    expect(result.likes).toBe(seeded.likes + 1)
  })

  it('未知 id 返回 null', () => {
    const store = createStore()
    expect(store.setLiked(999, true)).toBeNull()
  })
})

describe('remove / reset', () => {
  it('删除已存在条目返回 true，未知 id 返回 false', () => {
    const store = createStore()
    const created = store.create({ title: '待删除', body: '正文' })

    expect(store.remove(created.id)).toBe(true)
    expect(store.get(created.id)).toBeNull()
    expect(store.list()).toHaveLength(3)
    expect(store.remove(created.id)).toBe(false)
  })

  it('reset 恢复到预置数据', () => {
    const store = createStore()
    store.create({ title: '临时', body: '内容' })
    store.reset()

    expect(store.list()).toHaveLength(3)
    expect(store.list().map((post) => post.title)).toEqual([
      '推送已迁移到服务端',
      '今日热搜联动',
      '欢迎来到小晶推送馆'
    ])
  })
})

describe('封装性', () => {
  it('返回副本，外部修改不会污染仓储', () => {
    const store = createStore()
    const created = store.create({ title: '原标题', body: '原正文' })
    created.title = '被外部改掉'

    const listed = store.list()[0]
    listed.body = '被外部改掉'

    expect(store.get(created.id)).toMatchObject({ title: '原标题', body: '原正文' })
  })
})
