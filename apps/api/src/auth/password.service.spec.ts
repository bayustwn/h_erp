import { describe, expect, it } from 'vitest'
import { PasswordService } from './password.service.js'

describe('PasswordService', () => {
  it('verifies a valid password hash', async () => {
    const service = new PasswordService()
    const passwordHash = await service.hash('Password123!')

    await expect(service.verify('Password123!', passwordHash)).resolves.toBe(true)
    await expect(service.verify('wrong-password', passwordHash)).resolves.toBe(false)
  })
})
