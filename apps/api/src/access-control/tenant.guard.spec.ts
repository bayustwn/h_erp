import { BadRequestException, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { describe, expect, it, vi } from 'vitest'
import { AccessControlService } from './access-control.service.js'
import type { RequestWithAccessContext } from './access-control.types.js'
import { TenantGuard } from './tenant.guard.js'

const companyId = '00000000-0000-4000-8000-000000000001'
const branchId = '00000000-0000-4000-8000-000000000002'

function createContext(request: unknown): ExecutionContext {
  return {
    getHandler: () => TenantGuard,
    getClass: () => TenantGuard,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext
}

describe('TenantGuard', () => {
  it('attaches tenant context after access is validated', async () => {
    const request: RequestWithAccessContext = {
      headers: {
        'x-company-id': companyId,
        'x-branch-id': branchId,
      },
      user: { id: 'user-id', email: 'user@example.test', fullName: 'Test User' },
    }
    const accessControlService = {
      assertTenantAccess: vi.fn().mockResolvedValue(undefined),
    }
    const guard = new TenantGuard(
      {
        getAllAndOverride: () => ({ branch: 'required' }),
      } as unknown as Reflector,
      accessControlService as unknown as AccessControlService,
    )

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(request).toMatchObject({
      tenant: {
        companyId,
        branchId,
      },
    })
    expect(accessControlService.assertTenantAccess).toHaveBeenCalledWith(
      'user-id',
      request.tenant,
    )
  })

  it('rejects invalid company headers', async () => {
    const guard = new TenantGuard(
      {
        getAllAndOverride: () => ({ branch: 'optional' }),
      } as unknown as Reflector,
      {
        assertTenantAccess: vi.fn(),
      } as unknown as AccessControlService,
    )

    await expect(
      guard.canActivate(
        createContext({
          headers: { 'x-company-id': 'not-a-uuid' },
          user: { id: 'user-id' },
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
