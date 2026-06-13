import { describe, expect, it } from 'vitest'
import { HealthController } from './health.controller.js'

describe('HealthController', () => {
  it('returns API health status', () => {
    const controller = new HealthController()

    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'api',
    })
  })
})
