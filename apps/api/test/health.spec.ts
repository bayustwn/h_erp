import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'

describe('Health', () => {
  it('returns OK', async () => {
    const { get } = await api()
    const res = await get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
  })
})
