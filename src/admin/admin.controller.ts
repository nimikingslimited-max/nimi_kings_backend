import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto.js';
import { CreateStaffUserDto } from './dto/create-staff-user.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Admin Administration & Governance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // DASHBOARD ANALYTICS OVERVIEW
  // ==========================================

  @Get('dashboard')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get platform-wide operational KPIs, domain statistics, urgent action queues, and live activity feeds',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive administrative dashboard analytics payload',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMIN or SUPER_ADMIN role',
  })
  getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  // ==========================================
  // ENTERPRISE USER DIRECTORY & RBAC
  // ==========================================

  @Get('users')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'List and filter enterprise user accounts (search name/email/phone, filter by role, status, verification, KYC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated user directory with roles and profile metadata',
  })
  getUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get 360-degree user dossier (personal profile, roles, customer/agent metrics, and user audit trail)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User dossier details',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Update user account status (ACTIVE, SUSPENDED, DEACTIVATED) - revokes active sessions on suspension',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User account status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Admin cannot suspend or deactivate their own account',
  })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserStatus(id, dto, adminId);
  }

  @Patch('users/:id/roles')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Reassign system roles (RBAC) to a user (auto-provisions Agent profile if AGENT role is added)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User roles updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid roles list or self-demotion prevented',
  })
  updateUserRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserRoles(id, dto, adminId);
  }

  @Post('users/staff')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Direct provisioning of internal staff or verified field agents by administrators',
  })
  @ApiResponse({
    status: 201,
    description: 'Staff account provisioned with initial credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Email already registered or invalid role',
  })
  createStaffUser(
    @Body() dto: CreateStaffUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.createStaffUser(dto, adminId);
  }
}
