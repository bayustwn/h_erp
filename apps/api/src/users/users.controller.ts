import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ParseUUIDPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PermissionGuard } from '../access-control/permission.guard.js'
import { RequirePermissions } from '../access-control/permissions.decorator.js'
import { CurrentTenant, RequireTenant } from '../access-control/tenant.decorator.js'
import { TenantGuard } from '../access-control/tenant.guard.js'
import type { TenantContext } from '../access-control/access-control.types.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js'
import {
  createUserSchema,
  updateUserBranchAccessSchema,
  updateUserCompanyAccessSchema,
  updateUserRolesSchema,
  updateUserSchema,
  updateUserStatusSchema,
  usersQuerySchema,
  type CreateUserInput,
  type UpdateUserBranchAccessInput,
  type UpdateUserCompanyAccessInput,
  type UpdateUserInput,
  type UpdateUserRolesInput,
  type UpdateUserStatusInput,
  type UsersQuery,
} from './users.schemas.js'
import { UsersService } from './users.service.js'

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
@RequireTenant()
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user.read')
  list(
    @Query(new ZodValidationPipe(usersQuerySchema)) query: UsersQuery,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.usersService.list(query, tenant)
  }

  @Get(':id')
  @RequirePermissions('user.read')
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.usersService.getById(id, tenant)
  }

  @Post()
  @RequirePermissions('user.create')
  create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.usersService.create(body, tenant)
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.usersService.update(id, body, tenant)
  }

  @Patch(':id/status')
  @RequirePermissions('user.disable')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema))
    body: UpdateUserStatusInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.usersService.updateStatus(id, body, tenant)
  }

  @Put(':id/roles')
  @RequirePermissions('role.assign')
  updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserRolesSchema)) body: UpdateUserRolesInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.usersService.updateRoles(id, body, tenant)
  }

  @Put(':id/company-access')
  @RequirePermissions('user.update')
  updateCompanyAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserCompanyAccessSchema))
    body: UpdateUserCompanyAccessInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.usersService.updateCompanyAccess(id, body, tenant)
  }

  @Put(':id/branch-access')
  @RequirePermissions('user.update')
  updateBranchAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserBranchAccessSchema))
    body: UpdateUserBranchAccessInput,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.usersService.updateBranchAccess(id, body, tenant)
  }
}
