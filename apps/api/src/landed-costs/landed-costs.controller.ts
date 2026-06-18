import {
  Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  landedCostQuerySchema, createLandedCostSchema, updateLandedCostSchema, updateLandedCostStatusSchema,
  type CreateLandedCostInput, type LandedCostQuery, type UpdateLandedCostInput, type UpdateLandedCostStatusInput,
} from './landed-costs.schemas.js'
import { LandedCostsService } from './landed-costs.service.js'

@Controller('landed-costs')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class LandedCostsController {
  constructor(
    @Inject(LandedCostsService) private readonly service: LandedCostsService,
  ) {}

  @Get()
  @RequirePermissions('purchase.order.read')
  list(@Query(new ZodValidationPipe(landedCostQuerySchema)) query: LandedCostQuery, @CurrentTenant() tenant: TenantContext) {
    return this.service.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('purchase.order.read')
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.service.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('purchase.order.create')
  create(
    @Body(new ZodValidationPipe(createLandedCostSchema)) body: CreateLandedCostInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, tenant, user.id)
  }

  @Patch(':id')
  @RequirePermissions('purchase.order.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLandedCostSchema)) body: UpdateLandedCostInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, body, tenant, user.id)
  }

  @Patch(':id/status')
  @RequirePermissions('purchase.order.cancel')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLandedCostStatusSchema)) body: UpdateLandedCostStatusInput,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, body, tenant, user.id)
  }
}
