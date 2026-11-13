import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import PublishCard from '../../src/components/PublishCard.vue'
import { usePostsStore } from '../../src/stores/posts.js'

let store

function mountCard() {
  const pinia = createPinia()
  setActivePinia(pinia)
  store = usePostsStore()
  return mount(PublishCard, { global: { plugins: [pinia] }, attachTo: document.body })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('PublishCard 校验', () => {
  it('标题与正文都为空时显示提示且不发布', async () => {
    const wrapper = mountCard()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('.hint').text()).toBe('标题和正文不能都为空哦～')
    expect(store.posts).toHaveLength(0)
  })

  it('只有正文时提示填写标题', async () => {
    const wrapper = mountCard()
    await wrapper.get('textarea').setValue('只有正文')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('.hint').text()).toBe('请填写标题')
  })

  it('只有标题时提示填写正文', async () => {
    const wrapper = mountCard()
    await wrapper.get('input[type="text"]').setValue('只有标题')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('.hint').text()).toBe('请填写正文内容')
  })
})

describe('PublishCard 发布', () => {
  it('发布成功后清空表单并提示', async () => {
    const wrapper = mountCard()
    await wrapper.get('input[type="text"]').setValue('新的推送')
    await wrapper.get('textarea').setValue('正文内容')
    await wrapper.get('form').trigger('submit')

    expect(store.posts).toHaveLength(1)
    expect(store.posts[0].title).toBe('新的推送')
    expect(wrapper.get('input[type="text"]').element.value).toBe('')
    expect(wrapper.get('textarea').element.value).toBe('')
    expect(wrapper.get('.hint').text()).toBe('发布成功 ✓ 已保存到本地')
  })
})

describe('PublishCard 编辑态', () => {
  it('进入编辑态后按钮变为保存修改、表单回填、出现取消按钮', async () => {
    const wrapper = mountCard()
    store.publish({ title: '原标题', body: '原正文' })
    store.startEdit(store.posts[0].id)
    await nextTick()

    expect(wrapper.get('.btn-publish').text()).toBe('保存修改')
    expect(wrapper.get('input[type="text"]').element.value).toBe('原标题')
    expect(wrapper.get('textarea').element.value).toBe('原正文')
    expect(wrapper.find('.btn-cancel').exists()).toBe(true)
  })

  it('保存修改后更新原条目并退出编辑态', async () => {
    const wrapper = mountCard()
    store.publish({ title: '原标题', body: '原正文' })
    store.startEdit(store.posts[0].id)
    await nextTick()

    await wrapper.get('input[type="text"]').setValue('改后的标题')
    await wrapper.get('form').trigger('submit')

    expect(store.posts).toHaveLength(1)
    expect(store.posts[0].title).toBe('改后的标题')
    expect(store.editingId).toBeNull()
    expect(wrapper.get('.btn-publish').text()).toBe('发 布')
    expect(wrapper.get('.hint').text()).toBe('修改已保存 ✓')
  })

  it('点击取消编辑退出编辑态并清空表单', async () => {
    const wrapper = mountCard()
    store.publish({ title: '原标题', body: '原正文' })
    store.startEdit(store.posts[0].id)
    await nextTick()

    await wrapper.get('.btn-cancel').trigger('click')
    expect(store.editingId).toBeNull()
    expect(wrapper.get('input[type="text"]').element.value).toBe('')
  })
})

describe('PublishCard 热搜联动', () => {
  it('prefill 方法填入标题并聚焦', async () => {
    const wrapper = mountCard()
    wrapper.vm.prefill('来自热搜的标题')
    await nextTick()
    expect(wrapper.get('input[type="text"]').element.value).toBe('来自热搜的标题')
    expect(document.activeElement).toBe(wrapper.get('textarea').element)
  })

  it('编辑态中 prefill 会先退出编辑态', async () => {
    const wrapper = mountCard()
    store.publish({ title: '原标题', body: '原正文' })
    store.startEdit(store.posts[0].id)
    await nextTick()

    wrapper.vm.prefill('热点标题')
    await nextTick()
    expect(store.editingId).toBeNull()
    expect(wrapper.get('input[type="text"]').element.value).toBe('热点标题')
  })
})
