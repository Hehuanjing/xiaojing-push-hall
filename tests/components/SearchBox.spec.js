import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SearchBox from '../../src/components/SearchBox.vue'

describe('SearchBox', () => {
  it('输入后 120ms 防抖才 emit', async () => {
    vi.useFakeTimers()
    const wrapper = mount(SearchBox, { props: { modelValue: '' } })

    await wrapper.get('input').setValue('持久化')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    vi.advanceTimersByTime(120)
    expect(wrapper.emitted('update:modelValue')).toEqual([['持久化']])
  })

  it('连续输入只 emit 最后一次', async () => {
    vi.useFakeTimers()
    const wrapper = mount(SearchBox, { props: { modelValue: '' } })
    const input = wrapper.get('input')

    await input.setValue('v')
    vi.advanceTimersByTime(60)
    await input.setValue('vu')
    vi.advanceTimersByTime(60)
    await input.setValue('vue')
    vi.advanceTimersByTime(120)

    expect(wrapper.emitted('update:modelValue')).toEqual([['vue']])
  })

  it('外部 modelValue 变化时同步输入框', async () => {
    const wrapper = mount(SearchBox, { props: { modelValue: '' } })
    await wrapper.setProps({ modelValue: '马拉松' })
    expect(wrapper.get('input').element.value).toBe('马拉松')
  })

  it('提供可访问名称与占位提示', () => {
    const wrapper = mount(SearchBox)
    expect(wrapper.get('input').attributes('aria-label')).toBe('搜索我的推送')
    expect(wrapper.get('input').attributes('placeholder')).toContain('搜索')
  })
})
