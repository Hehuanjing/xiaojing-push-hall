import { describe, expect, it } from 'vitest'
import {
  BODY_MAX,
  TITLE_MAX,
  normalizePost,
  normalizePosts,
  validatePostInput
} from '../../shared/postSchema.js'

describe('常量', () => {
  it('标题与正文上限与产品约定一致', () => {
    expect(TITLE_MAX).toBe(60)
    expect(BODY_MAX).toBe(1000)
  })
})

describe('validatePostInput', () => {
  it('标题与正文都为空时提示', () => {
    expect(validatePostInput({ title: '  ', body: '  ' })).toEqual({
      ok: false,
      message: '标题和正文不能都为空哦～'
    })
    expect(validatePostInput({})).toEqual({ ok: false, message: '标题和正文不能都为空哦～' })
    expect(validatePostInput(null)).toEqual({ ok: false, message: '标题和正文不能都为空哦～' })
  })

  it('缺少标题或正文时分别提示', () => {
    expect(validatePostInput({ title: '', body: '正文' })).toEqual({
      ok: false,
      message: '请填写标题'
    })
    expect(validatePostInput({ title: '标题', body: '' })).toEqual({
      ok: false,
      message: '请填写正文内容'
    })
  })

  it('通过校验时返回去空格并截断后的内容', () => {
    const longTitle = 't'.repeat(TITLE_MAX + 20)
    const longBody = 'b'.repeat(BODY_MAX + 20)
    const result = validatePostInput({ title: `  ${longTitle}  `, body: `  ${longBody}  ` })

    expect(result.ok).toBe(true)
    expect(result.title).toHaveLength(TITLE_MAX)
    expect(result.body).toHaveLength(BODY_MAX)
    expect(result.title.startsWith(' ')).toBe(false)
  })

  it('非字符串字段按空值处理', () => {
    expect(validatePostInput({ title: 123, body: '正文' })).toEqual({
      ok: false,
      message: '请填写标题'
    })
  })
})

describe('normalizePost / normalizePosts', () => {
  it('过滤非法条目并补全默认值', () => {
    const list = [
      null,
      { id: 'x', title: '非法' },
      { id: 1, title: '旧记录', body: '正文', time: 1000 },
      { id: 2, title: '新记录', body: '正文', time: 2000, likes: 2.7, liked: true }
    ]
    const result = normalizePosts(list)
    expect(result).toEqual([
      { id: 1, title: '旧记录', body: '正文', time: 1000, likes: 0, liked: false },
      { id: 2, title: '新记录', body: '正文', time: 2000, likes: 2, liked: true }
    ])
  })

  it('非数组输入返回空数组', () => {
    expect(normalizePosts(null)).toEqual([])
    expect(normalizePosts({})).toEqual([])
  })

  it('normalizePost 截断超长文本并修正非法时间与负数点赞', () => {
    const post = normalizePost({
      id: 3,
      title: 't'.repeat(TITLE_MAX + 5),
      body: 'b'.repeat(BODY_MAX + 5),
      time: Number.NaN,
      likes: -3,
      liked: 'yes'
    })
    expect(post.title).toHaveLength(TITLE_MAX)
    expect(post.body).toHaveLength(BODY_MAX)
    expect(Number.isFinite(post.time)).toBe(true)
    expect(post.likes).toBe(0)
    expect(post.liked).toBe(false)
  })

  it('normalizePost 对非法输入返回 null', () => {
    expect(normalizePost(null)).toBeNull()
    expect(normalizePost({ title: 'no id' })).toBeNull()
  })
})
