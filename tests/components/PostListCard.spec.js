import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import PostListCard from '../../src/components/PostListCard.vue'
import { usePostsStore } from '../../src/stores/posts.js'

let store

function createFakeApi() {
  const db = new Map()
  let seq = 0

  return {
    list: async () => [...db.values()],
    create: async ({ title, body }) => {
      const post = { id: 9000 + ++seq, title, body, time: 1000 + seq, likes: 0, liked: false }
      db.set(post.id, post)
      return { ...post }
    },
    update: async (id, { title, body }) => {
      const post = db.get(id)
      Object.assign(post, { title, body, time: 2000 })
      return { ...post }
    },
    like: async (id, liked) => {
      const post = db.get(id)
      post.liked = liked
      post.likes = Math.max(0, post.likes + (liked ? 1 : -1))
      return { ...post }
    },
    remove: async (id) => {
      db.delete(id)
      return null
    }
  }
}

function mountCard() {
  const pinia = createPinia()
  setActivePinia(pinia)
  store = usePostsStore()
  store.configure({ api: createFakeApi() })
  return mount(PostListCard, { global: { plugins: [pinia] } })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('PostListCard 空态与计数', () => {
  it('没有推送时显示引导空态', () => {
    const wrapper = mountCard()
    expect(wrapper.get('.count-chip').text()).toBe('共 0 条')
    expect(wrapper.text()).toContain('还没有推送，快来发布第一条吧！')
  })

  it('加载中显示加载态而不是空态', async () => {
    const wrapper = mountCard()
    store.loading = true
    await nextTick()

    expect(wrapper.text()).toContain('正在从服务端加载推送…')
    expect(wrapper.text()).not.toContain('还没有推送，快来发布第一条吧！')

    store.loading = false
    await nextTick()
    expect(wrapper.text()).toContain('还没有推送，快来发布第一条吧！')
  })

  it('有推送时渲染条目与总数，新发布在前', async () => {
    const wrapper = mountCard()
    await store.publish({ title: '第一条', body: '正文一' })
    await store.publish({ title: '第二条', body: '正文二' })
    await nextTick()

    const titles = wrapper.findAll('.post-title').map((node) => node.text())
    expect(titles).toEqual(['第二条', '第一条'])
    expect(wrapper.get('.count-chip').text()).toBe('共 2 条')
  })
})

describe('PostListCard 搜索', () => {
  it('按关键词过滤并显示命中数', async () => {
    const wrapper = mountCard()
    await store.publish({ title: '前端调试记录', body: '缓存持久化验证' })
    await store.publish({ title: '周末马拉松', body: '报名了志愿者' })

    store.setKeyword('持久化')
    await nextTick()

    expect(wrapper.findAll('.post')).toHaveLength(1)
    expect(wrapper.get('.count-chip').text()).toBe('共 2 条 · 命中 1 条')
  })

  it('无匹配时显示搜索空态并回显关键词', async () => {
    const wrapper = mountCard()
    await store.publish({ title: '标题', body: '正文' })
    store.setKeyword('不存在的关键词')
    await nextTick()

    expect(wrapper.findAll('.post')).toHaveLength(0)
    expect(wrapper.text()).toContain('没有匹配「不存在的关键词」的推送')
  })

  it('搜索框输入后经过防抖更新 store 关键词', async () => {
    vi.useFakeTimers()
    const wrapper = mountCard()
    await store.publish({ title: '标题', body: '正文' })

    await wrapper.get('.search-input').setValue('正文')
    vi.advanceTimersByTime(120)
    await nextTick()

    expect(store.keyword).toBe('正文')
  })
})

describe('PostListCard 条目操作', () => {
  it('点击编辑按钮进入编辑态并标记条目', async () => {
    const wrapper = mountCard()
    await store.publish({ title: '待编辑', body: '正文' })
    const id = store.posts[0].id
    await nextTick()

    await wrapper.get('.btn-edit').trigger('click')
    expect(store.editingId).toBe(id)
    expect(wrapper.get('.post').classes()).toContain('editing')
  })

  it('点赞按钮切换点赞状态', async () => {
    const wrapper = mountCard()
    await store.publish({ title: '待点赞', body: '正文' })
    await nextTick()

    await wrapper.get('.btn-like').trigger('click')
    await flushPromises()

    expect(store.posts[0].liked).toBe(true)
    expect(wrapper.get('.like-count').text()).toBe('1')
  })

  it('确认后删除条目', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountCard()
    await store.publish({ title: '待删除', body: '正文' })
    await nextTick()

    await wrapper.get('.btn-del').trigger('click')
    await flushPromises()

    expect(window.confirm).toHaveBeenCalled()
    expect(store.posts).toHaveLength(0)
  })

  it('取消确认时保留条目', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mountCard()
    await store.publish({ title: '保留', body: '正文' })
    await nextTick()

    await wrapper.get('.btn-del').trigger('click')
    await flushPromises()

    expect(store.posts).toHaveLength(1)
  })
})
