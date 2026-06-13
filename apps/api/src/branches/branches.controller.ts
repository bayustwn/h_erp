import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  branchesQuerySchema,
  createBranchSchema,
  updateBranchSchema,
  updateBranchStatusSchema,
  type BranchesQuery,
  type CreateBranchInput,
  type UpdateBranchInput,
  type UpdateBranchStatusInput,
} from './branches.schemas.js'
import { BranchesService } from './branches.service.js'

@Controller('branches')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class BranchesController {
  constructor(
    @Inject(BranchesService) private readonly branchesService: BranchesService,
  ) {}

  @Get()
  @RequirePermissions('branch.read')
  list(
    @Query(new ZodValidationPipe(branchesQuerySchema)) query: BranchesQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.branchesService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('branch.read')
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.branchesService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('branch.create')
  create(
    @Body(new ZodValidationPipe(createBranchSchema)) body: CreateBranchInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.branchesService.create(body, tenant)
  }

  @Patch(':id')
  @RequirePermissions('branch.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateBranchSchema)) body: UpdateBranchInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.branchesService.update(id, body, tenant)
  }

  @Patch(':id/status')
  @RequirePermissions('branch.delete')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateBranchStatusSchema))
    body: UpdateBranchStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.branchesService.updateStatus(id, body, tenant)
  }
}
