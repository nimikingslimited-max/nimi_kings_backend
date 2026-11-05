import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
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
import { UsersService } from './users.service.js';
import { AdminService } from '../admin/admin.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { FavoriteQueryDto } from './dto/favorite-query.dto.js';
import { SubmitKycDto } from './dto/submit-kyc.dto.js';
import { ReviewKycDto } from './dto/review-kyc.dto.js';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto.js';
import { DeactivateAccountDto } from './dto/deactivate-account.dto.js';
import { AgentPropertyQueryDto } from './dto/agent-property-query.dto.js';
import { AgentLeadQueryDto } from './dto/agent-lead-query.dto.js';
import { UpdateAgentLeadDto } from './dto/update-agent-lead.dto.js';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('User Profile & Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
  ) {}

  @Get('profile')
  @ApiOperation({
    summary:
      'Get complete personal profile of the authenticated user (including customer/agent extended details)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns full user profile and active roles',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({
    summary:
      'Update authenticated user personal profile (name, phone, address, city, state, profile avatar image, occupation, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or phone number conflict',
  })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Get comprehensive Customer Dashboard analytics (profile completion %, active enquiries, scheduled site visits, unread notifications count, active chats, assigned consultants)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Aggregated customer metrics, upcoming scheduled visits, and latest activities',
  })
  getCustomerDashboard(@CurrentUser('id') userId: string) {
    return this.usersService.getCustomerDashboard(userId);
  }

  @Get('agent/dashboard')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get comprehensive Agent Dashboard analytics (assigned properties, leads pipeline, today & upcoming inspections, customer reviews, performance KPIs)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Aggregated agent metrics, today visits, urgent leads, and portfolio preview',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Agent or Admin role required',
  })
  getAgentDashboard(@CurrentUser('id') userId: string) {
    return this.usersService.getAgentDashboard(userId);
  }

  @Get('admin/dashboard')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get platform-wide operational KPIs, domain statistics, urgent action queues, and live activity feeds',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive administrative dashboard analytics payload',
  })
  getAdminDashboard() {
    return this.adminService.getDashboardOverview();
  }

  @Get('agent/properties')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get paginated portfolio of properties assigned to or created by the agent with lead and inspection metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of agent properties with metrics',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Agent or Admin role required',
  })
  getAgentProperties(
    @CurrentUser('id') userId: string,
    @Query() query: AgentPropertyQueryDto,
  ) {
    return this.usersService.getAgentProperties(userId, query);
  }

  @Get('agent/properties/:propertyId/stats')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get deep property performance analytics for an agent (leads, scheduled site visits, reviews, wishlist saves)',
  })
  @ApiParam({ name: 'propertyId', description: 'Property UUID' })
  @ApiResponse({
    status: 200,
    description: 'Detailed property agent performance and lead analytics',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You do not have permission to view metrics for this property',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  getAgentPropertyDetails(
    @CurrentUser('id') userId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.usersService.getAgentPropertyDetails(userId, propertyId);
  }

  @Get('agent/leads')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get paginated customer leads and enquiries assigned to the agent with pipeline status summary',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of customer leads with status counters',
  })
  getAgentLeads(
    @CurrentUser('id') userId: string,
    @Query() query: AgentLeadQueryDto,
  ) {
    return this.usersService.getAgentLeads(userId, query);
  }

  @Get('agent/leads/:leadId')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get single customer lead details with full customer history and property context',
  })
  @ApiParam({ name: 'leadId', description: 'Enquiry lead UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lead details with customer interaction history',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if lead is not assigned to this agent',
  })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  getAgentLeadById(
    @CurrentUser('id') userId: string,
    @Param('leadId') leadId: string,
  ) {
    return this.usersService.getAgentLeadById(userId, leadId);
  }

  @Patch('agent/leads/:leadId')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Update customer lead pipeline status and record internal agent follow-up notes',
  })
  @ApiParam({ name: 'leadId', description: 'Enquiry lead UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lead updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if lead is not assigned to this agent',
  })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  updateAgentLead(
    @CurrentUser('id') userId: string,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateAgentLeadDto,
  ) {
    return this.usersService.updateAgentLead(userId, leadId, dto);
  }

  @Get('agent/clients')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get paginated list of all customers / clients interacting with this agent (CRM cards)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated customer CRM cards with engagement metrics',
  })
  getAgentClients(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.getAgentClients(userId, page, limit, search);
  }

  @Get('agent/profile')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.PROPERTY_MANAGER)
  @ApiOperation({
    summary:
      'Get authenticated agent full professional profile, career metrics, and credentials',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent professional profile and aggregate career statistics',
  })
  getAgentProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getAgentProfile(userId);
  }

  @Patch('agent/profile')
  @Roles(RoleType.AGENT, RoleType.ADMIN, RoleType.SUPER_ADMIN, RoleType.PROPERTY_MANAGER)
  @ApiOperation({
    summary:
      'Update agent professional profile, specialties, bio, office address, and contact details',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent profile updated successfully',
  })
  updateAgentProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAgentProfileDto,
  ) {
    return this.usersService.updateAgentProfile(userId, dto);
  }

  @Public()
  @Get('agents/public/:agentCode')
  @ApiOperation({
    summary:
      'Public verified digital business card & showcase for an agent (active listings & verified customer reviews)',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent digital showcase card with active listings and client reviews',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent profile not found or inactive',
  })
  getPublicAgentCard(@Param('agentCode') agentCode: string) {
    return this.usersService.getPublicAgentCard(agentCode);
  }

  @Get('my-agent')
  @ApiOperation({
    summary:
      'Get contact cards for dedicated field agents / consultants currently assigned to assist this customer',
  })
  @ApiResponse({
    status: 200,
    description: 'List of assigned consultants',
  })
  getMyAssignedAgents(@CurrentUser('id') userId: string) {
    return this.usersService.getMyAssignedAgents(userId);
  }

  // ==========================================
  // SAVED PROPERTIES / FAVORITES (WISHLIST)
  // ==========================================

  @Get('favorites')
  @ApiOperation({
    summary:
      'Get customer saved properties / wishlist with pagination, active pricing, primary media, and verification status',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of saved favorite properties',
  })
  getFavorites(
    @CurrentUser('id') userId: string,
    @Query() query: FavoriteQueryDto,
  ) {
    return this.usersService.getFavorites(userId, query);
  }

  @Get('favorites/check/:propertyId')
  @ApiOperation({
    summary: 'Check if a specific property is in customer saved favorites',
  })
  @ApiParam({ name: 'propertyId', description: 'Property UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns { propertyId, isFavorite: boolean }',
  })
  checkIsFavorite(
    @CurrentUser('id') userId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.usersService.checkIsFavorite(userId, propertyId);
  }

  @Post('favorites/:propertyId')
  @ApiOperation({
    summary: 'Add a property to customer saved favorites / wishlist',
  })
  @ApiParam({ name: 'propertyId', description: 'Property UUID to save' })
  @ApiResponse({
    status: 201,
    description: 'Property added to saved favorites',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  addToFavorites(
    @CurrentUser('id') userId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.usersService.addToFavorites(userId, propertyId);
  }

  @Delete('favorites/:propertyId')
  @ApiOperation({
    summary: 'Remove a property from customer saved favorites / wishlist',
  })
  @ApiParam({ name: 'propertyId', description: 'Property UUID to remove' })
  @ApiResponse({
    status: 200,
    description: 'Property removed from saved favorites',
  })
  removeFromFavorites(
    @CurrentUser('id') userId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.usersService.removeFromFavorites(userId, propertyId);
  }

  // ==========================================
  // CUSTOMER KYC & IDENTITY VERIFICATION
  // ==========================================

  @Get('kyc')
  @ApiOperation({
    summary:
      'Get customer KYC identity verification status and submitted documents',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns current KYC status and metadata',
  })
  getKycStatus(@CurrentUser('id') userId: string) {
    return this.usersService.getKycStatus(userId);
  }

  @Post('kyc')
  @ApiOperation({
    summary:
      'Submit or re-submit customer identity documents for compliance review (NIN, Drivers License, Passport, Voters Card)',
  })
  @ApiResponse({
    status: 201,
    description: 'KYC documents submitted and status set to PENDING',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or KYC already verified',
  })
  submitKyc(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitKycDto,
  ) {
    return this.usersService.submitKyc(userId, dto);
  }

  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.VERIFICATION_OFFICER,
  )
  @Patch('kyc/:customerId/review')
  @ApiOperation({
    summary:
      'Review and approve/reject customer KYC submission (Compliance / Admin)',
  })
  @ApiParam({ name: 'customerId', description: 'Customer user UUID' })
  @ApiResponse({
    status: 200,
    description: 'KYC status updated (VERIFIED / REJECTED)',
  })
  reviewKyc(
    @CurrentUser('id') adminId: string,
    @Param('customerId') customerId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.usersService.reviewKyc(adminId, customerId, dto);
  }

  // ==========================================
  // SAVED SEARCHES & PROPERTY ALERTS
  // ==========================================

  @Post('saved-searches')
  @ApiOperation({
    summary:
      'Save a property search criteria preset with email/push alert preferences',
  })
  @ApiResponse({
    status: 201,
    description: 'Saved search preset created successfully',
  })
  createSavedSearch(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSavedSearchDto,
  ) {
    return this.usersService.createSavedSearch(userId, dto);
  }

  @Get('saved-searches')
  @ApiOperation({
    summary: 'List all saved searches and alerts for authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'List of customer saved searches',
  })
  getSavedSearches(@CurrentUser('id') userId: string) {
    return this.usersService.getSavedSearches(userId);
  }

  @Get('saved-searches/:id/matches')
  @ApiOperation({
    summary:
      'Run a saved search preset on demand and get latest matching properties',
  })
  @ApiParam({ name: 'id', description: 'Saved search UUID' })
  @ApiResponse({
    status: 200,
    description: 'Matching properties for the saved search criteria',
  })
  getSavedSearchMatches(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getSavedSearchMatches(userId, id, limit);
  }

  @Delete('saved-searches/:id')
  @ApiOperation({
    summary: 'Delete a saved search preset',
  })
  @ApiParam({ name: 'id', description: 'Saved search UUID to delete' })
  @ApiResponse({
    status: 200,
    description: 'Saved search deleted successfully',
  })
  deleteSavedSearch(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteSavedSearch(userId, id);
  }

  // ==========================================
  // ACCOUNT SETTINGS & DEACTIVATION
  // ==========================================

  @Post('deactivate-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Self-service account deactivation (requires password confirmation, revokes all sessions, and marks account DEACTIVATED)',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Incorrect password',
  })
  deactivateAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: DeactivateAccountDto,
  ) {
    return this.usersService.deactivateAccount(userId, dto);
  }
}
