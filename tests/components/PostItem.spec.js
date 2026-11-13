import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PostItem from '../../src/components/PostItem.vue'

const basePost = {
  id: 42,
  title: '测试标题',
  body: '测试正文内容',
  time: new Date(2026, 10, 13, 9, 5).getTime(),
  likes: 0,
  liked: false
}

describe('PostItem', () => {
  it('渲染标题、正文与格式化时间', () => {
    const wrapper = mount(PostItem, { props: { post: basePost } })
    expect(wrapper.get('.post-title').text()).toBe('测试标题')
    expect(wrapper.get('.post-body').text()).toBe('测试正文内容')
    expect(wrapper.get('.post-time').text()).toBe('2026-11-13 09:05')
  })

  it('未点赞且计数为 0 时不显示数字', () => {
    const wrapper = mount(PostItem, { props: { post: basePost } })
    expect(wrapper.find('.like-count').exists()).toBe(false)
    expect(wrapper.get('.btn-like').classes()).not.toContain('liked')
  })

  it('已点赞时带 liked 类并显示计数', () => {
    const wrapper = mount(PostItem, { props: { post: { ...basePost, likes: 3, liked: true } } })
    expect(wrapper.get('.btn-like').classes()).toContain('liked')
    expect(wrapper.get('.like-count').text()).toBe('3')
    expect(wrapper.get('.btn-like').attributes('aria-pressed')).toBe('true')
  })

  it('点击动作按钮分别抛出对应 id', async () => {
    const wrapper = mount(PostItem, { props: { post: basePost } })
    await wrapper.get('.btn-edit').trigger('click')
    await wrapper.get('.btn-like').trigger('click')
    await wrapper.get('.btn-del').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[42]])
    expect(wrapper.emitted('like')).toEqual([[42]])
    expect(wrapper.emitted('delete')).toEqual([[42]])
  })

  it('editing 为 true 时带编辑态类名', () => {
    const wrapper = mount(PostItem, { props: { post: basePost, editing: true } })
    expect(wrapper.get('.post').classes()).toContain('editing')
  })
})
