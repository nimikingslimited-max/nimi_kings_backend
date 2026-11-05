import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { AdminPropertyQueryDto } from './dto/admin-property-query.dto.js';
import { UpdateListingStatusDto } from './dto/update-listing-status.dto.js';
import { AdminAssignAgentDto } from './dto/admin-assign-agent.dto.js';
import { AdminKycQueryDto } from './dto/admin-kyc-query.dto.js';
import { ReviewKycDto } from '../users/dto/review-kyc.dto.js';
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

  // ==========================================
  // PROPERTY CATALOG & LISTING GOVERNANCE
  // ==========================================

  @Get('properties')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.PROPERTY_MANAGER)
  @ApiOperation({
    summary:
      'List and filter all properties in catalog (search, filter by type, listing status, transaction type, assigned agent)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated properties catalog with commercial listing metadata',
  })
  getProperties(@Query() query: AdminPropertyQueryDto) {
    return this.adminService.getProperties(query);
  }

  @Get('properties/:id')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.PROPERTY_MANAGER)
  @ApiOperation({
    summary:
      'Get full administrative property dossier (listings, media, features, legal verifications, assigned agents)',
  })
  @ApiParam({ name: 'id', description: 'Property UUID or unique propertyCode' })
  @ApiResponse({
    status: 200,
    description: 'Full property details',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  getPropertyById(@Param('id') id: string) {
    return this.adminService.getPropertyById(id);
  }

  @Patch('properties/:id/listing-status')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.PROPERTY_MANAGER)
  @ApiOperation({
    summary:
      'Governance: Update property commercial listing status (PUBLISHED, DRAFT, PENDING_APPROVAL, SUSPENDED, SOLD, RENTED, EXPIRED)',
  })
  @ApiParam({ name: 'id', description: 'Property UUID or propertyCode' })
  @ApiResponse({
    status: 200,
    description: 'Property listing status updated successfully',
  })
  updatePropertyListingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateListingStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updatePropertyListingStatus(id, dto, adminId);
  }

  @Post('properties/:id/assign-agent')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.PROPERTY_MANAGER)
  @ApiOperation({
    summary: 'Assign or reassign a dedicated field agent to a property',
  })
  @ApiParam({ name: 'id', description: 'Property UUID or propertyCode' })
  @ApiResponse({
    status: 201,
    description: 'Agent assigned to property and notified',
  })
  assignAgentToProperty(
    @Param('id') id: string,
    @Body() dto: AdminAssignAgentDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.assignAgentToProperty(id, dto, adminId);
  }

  @Delete('properties/:id/agents/:agentId')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.PROPERTY_MANAGER)
  @ApiOperation({
    summary: 'Unassign a field agent from a property',
  })
  @ApiParam({ name: 'id', description: 'Property UUID or propertyCode' })
  @ApiParam({ name: 'agentId', description: 'Agent user UUID' })
  @ApiResponse({
    status: 200,
    description: 'Agent unassigned from property',
  })
  removeAgentFromProperty(
    @Param('id') id: string,
    @Param('agentId') agentId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.removeAgentFromProperty(id, agentId, adminId);
  }

  // ==========================================
  // CENTRALIZED COMPLIANCE & KYC QUEUE
  // ==========================================

  @Get('kyc')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.VERIFICATION_OFFICER)
  @ApiOperation({
    summary:
      'List and filter customer KYC compliance verification submissions (filter by status, search, ID type)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated customer KYC submissions queue',
  })
  getKycQueue(@Query() query: AdminKycQueryDto) {
    return this.adminService.getKycQueue(query);
  }

  @Get('kyc/:customerId')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.VERIFICATION_OFFICER)
  @ApiOperation({
    summary:
      'Get full KYC compliance dossier for a customer (uploaded ID docs, proof of address, compliance audit history)',
  })
  @ApiParam({ name: 'customerId', description: 'Customer user UUID' })
  @ApiResponse({
    status: 200,
    description: 'Detailed customer KYC dossier',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer profile not found',
  })
  getKycDossier(@Param('customerId') customerId: string) {
    return this.adminService.getKycDossier(customerId);
  }

  @Patch('kyc/:customerId/review')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.VERIFICATION_OFFICER)
  @ApiOperation({
    summary:
      'Compliance: Review and approve/reject customer KYC identity submission (dispatches customer notification)',
  })
  @ApiParam({ name: 'customerId', description: 'Customer user UUID' })
  @ApiResponse({
    status: 200,
    description: 'Customer KYC submission reviewed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Rejection reason required when rejecting submission',
  })
  reviewKycSubmission(
    @Param('customerId') customerId: string,
    @Body() dto: ReviewKycDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.reviewKycSubmission(customerId, dto, adminId);
  }
}
