import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { describe, expect, it, vi } from 'vitest'
import { AccessControlService } from './access-control.service.js'
import { PermissionGuard } from './permission.guard.js'

function createContext(request: unknown): ExecutionContext {
  return {
    getHandler: () => PermissionGuard,
    getClass: () => PermissionGuard,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext
}

describe('PermissionGuard', () => {
  it('allows requests when all required permissions are granted', async () => {
    const guard = new PermissionGuard(
      {
        getAllAndOverride: () => ['company.read'],
      } as unknown as Reflector,
      {
        hasPermissions: vi.fn().mockResolvedValue(true),
      } as unknown as AccessControlService,
    )

    await expect(
      guard.canActivate(
        createContext({
          user: { id: 'user-id' },
          tenant: { companyId: 'company-id' },
        }),
      ),
    ).resolves.toBe(true)
  })

  it('rejects requests when permissions are missing', async () => {
    const guard = new PermissionGuard(
      {
        getAllAndOverride: () => ['company.delete'],
      } as unknown as Reflector,
      {
        hasPermissions: vi.fn().mockResolvedValue(false),
      } as unknown as AccessControlService,
    )

    await expect(
      guard.canActivate(
        createContext({
          user: { id: 'user-id' },
          tenant: { companyId: 'company-id' },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })
})
