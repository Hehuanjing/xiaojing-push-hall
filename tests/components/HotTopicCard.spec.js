import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HotTopicCard from '../../src/components/HotTopicCard.vue'

const date = new Date(2026, 10, 13)

describe('HotTopicCard', () => {
  it('渲染 10 条热搜并按热度展示名次', () => {
    const wrapper = mount(HotTopicCard, { props: { date } })
    const items = wrapper.findAll('.hot-item')
    expect(items).toHaveLength(10)
    expect(items[0].get('.rank').classes()).toContain('rank-1')
    expect(items[1].get('.rank').classes()).toContain('rank-2')
    expect(items[2].get('.rank').classes()).toContain('rank-3')
    expect(items[3].get('.rank').classes()).not.toContain('rank-4')
  })

  it('条目带可交互语义与热度信息', () => {
    const wrapper = mount(HotTopicCard, { props: { date } })
    const first = wrapper.findAll('.hot-item')[0]
    expect(first.attributes('role')).toBe('button')
    expect(first.attributes('tabindex')).toBe('0')
    expect(first.get('.heat-num').text()).toMatch(/万热度$/)
  })

  it('点击条目 emit prefill 携带标题', async () => {
    const wrapper = mount(HotTopicCard, { props: { date } })
    const first = wrapper.findAll('.hot-item')[0]
    await first.trigger('click')
    expect(wrapper.emitted('prefill')).toHaveLength(1)
    expect(wrapper.emitted('prefill')[0][0]).toBe(first.get('.hot-title').text())
  })

  it('Enter 键同样触发 prefill，其他键不触发', async () => {
    const wrapper = mount(HotTopicCard, { props: { date } })
    const first = wrapper.findAll('.hot-item')[0]

    await first.trigger('keydown', { key: 'a' })
    expect(wrapper.emitted('prefill')).toBeUndefined()

    await first.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('prefill')).toHaveLength(1)
  })
})
