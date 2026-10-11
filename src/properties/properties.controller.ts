import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { PropertiesService } from './properties.service.js';
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';
import { PropertyQueryDto } from './dto/property-query.dto.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { AddPropertyMediaDto } from './dto/add-property-media.dto.js';
import { AssignFeaturesDto } from './dto/assign-features.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Public()
  @Get('features/all')
  @ApiOperation({ summary: 'Get all available property features / amenities' })
  @ApiResponse({ status: 200, description: 'List of all system features' })
  getAllFeatures() {
    return this.propertiesService.getAllFeatures();
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Browse and search properties with filters, pricing, and pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of properties' })
  findAll(@Query() query: PropertyQueryDto, @CurrentUser() user?: any) {
    return this.propertiesService.findAll(query, user);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single property details by ID or Property Code' })
  @ApiResponse({ status: 200, description: 'Property details with listings, media, and features' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new property (Agent / Admin)' })
  @ApiResponse({ status: 201, description: 'Property successfully created' })
  create(@Body() dto: CreatePropertyDto, @CurrentUser('id') userId: string) {
    return this.propertiesService.create(dto, userId);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update property details' })
  @ApiResponse({ status: 200, description: 'Property updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.update(id, dto, user);
  }

  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Soft delete a property' })
  @ApiResponse({ status: 200, description: 'Property deleted' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertiesService.remove(id, user);
  }

  // ==========================================
  // LISTINGS
  // ==========================================

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Post(':id/listings')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a commercial listing (Sale/Rent) for a property' })
  @ApiResponse({ status: 201, description: 'Listing created' })
  createListing(
    @Param('id') propertyId: string,
    @Body() dto: CreateListingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.propertiesService.createListing(propertyId, dto, userId);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Patch(':id/listings/:listingId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update listing pricing or status (Draft/Published/Sold)' })
  @ApiResponse({ status: 200, description: 'Listing updated' })
  updateListing(
    @Param('id') propertyId: string,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.propertiesService.updateListing(propertyId, listingId, dto);
  }

  // ==========================================
  // MEDIA
  // ==========================================

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Post(':id/media')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Attach photos, videos, or 360 tour metadata to a property' })
  @ApiResponse({ status: 201, description: 'Media added' })
  addMedia(
    @Param('id') propertyId: string,
    @Body() dto: AddPropertyMediaDto,
  ) {
    return this.propertiesService.addMedia(propertyId, dto);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Delete(':id/media/:mediaId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove a media item from a property' })
  @ApiResponse({ status: 200, description: 'Media deleted' })
  removeMedia(
    @Param('id') propertyId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.propertiesService.removeMedia(propertyId, mediaId);
  }

  // ==========================================
  // FEATURES
  // ==========================================

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Post(':id/features')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign features / amenities to a property' })
  @ApiResponse({ status: 200, description: 'Features updated' })
  assignFeatures(
    @Param('id') propertyId: string,
    @Body() dto: AssignFeaturesDto,
  ) {
    return this.propertiesService.assignFeatures(propertyId, dto.features);
  }
}
