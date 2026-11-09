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
import { AgricultureService } from './agriculture.service.js';
import { CreateFarmDto } from './dto/create-farm.dto.js';
import { UpdateFarmDto } from './dto/update-farm.dto.js';
import { FarmQueryDto } from './dto/farm-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Agriculture Asset Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('agriculture')
export class AgricultureController {
  constructor(private readonly agricultureService: AgricultureService) {}

  // ==========================================
  // FEATURE 1: FARMS & AGRICULTURAL ESTATES
  // ==========================================

  @Post('farms')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary: 'Register a new farm estate or agricultural production facility',
  })
  @ApiResponse({
    status: 201,
    description: 'Farm estate registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or unverified manager',
  })
  createFarm(
    @Body() dto: CreateFarmDto,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.agricultureService.createFarm(dto, creatorId);
  }

  @Get('farms')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'List and filter farm estates with active crop cycles, land utilization, and manager details',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of farm estates',
  })
  getFarms(@Query() query: FarmQueryDto) {
    return this.agricultureService.getFarms(query);
  }

  @Get('farms/:id')
  @ApiOperation({
    summary:
      'Get comprehensive dossier of a single farm (cycles, land utilization, financial summary)',
  })
  @ApiParam({ name: 'id', description: 'Farm UUID' })
  @ApiResponse({
    status: 200,
    description: 'Detailed farm profile and agronomic summary',
  })
  @ApiResponse({
    status: 404,
    description: 'Farm not found',
  })
  getFarmById(@Param('id') id: string) {
    return this.agricultureService.getFarmById(id);
  }

  @Patch('farms/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary: 'Update parameters, boundaries, manager, or status of a farm estate',
  })
  @ApiParam({ name: 'id', description: 'Farm UUID' })
  @ApiResponse({
    status: 200,
    description: 'Farm amended successfully',
  })
  updateFarm(
    @Param('id') id: string,
    @Body() dto: UpdateFarmDto,
    @CurrentUser('id') editorId: string,
  ) {
    return this.agricultureService.updateFarm(id, dto, editorId);
  }

  @Delete('farms/:id')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete a farm estate and cascade delete its crop cycles and records',
  })
  @ApiParam({ name: 'id', description: 'Farm UUID' })
  @ApiResponse({
    status: 200,
    description: 'Farm deleted successfully',
  })
  deleteFarm(
    @Param('id') id: string,
    @CurrentUser('id') deleterId: string,
  ) {
    return this.agricultureService.deleteFarm(id, deleterId);
  }
}
