import {
  Controller,
  Get,
  Post,
  Delete,
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
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { FavoriteQueryDto } from './dto/favorite-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
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
}
