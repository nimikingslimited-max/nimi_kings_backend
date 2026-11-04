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
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { FavoriteQueryDto } from './dto/favorite-query.dto.js';
import { SubmitKycDto } from './dto/submit-kyc.dto.js';
import { ReviewKycDto } from './dto/review-kyc.dto.js';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto.js';
import { DeactivateAccountDto } from './dto/deactivate-account.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('User Profile & Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
