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
import { CreateCropCycleDto } from './dto/create-crop-cycle.dto.js';
import { UpdateCropCycleDto } from './dto/update-crop-cycle.dto.js';
import { CropCycleQueryDto } from './dto/crop-cycle-query.dto.js';
import { CreateCropFieldLogDto } from './dto/create-crop-field-log.dto.js';
import { UpdateCropFieldLogDto } from './dto/update-crop-field-log.dto.js';
import { CropFieldLogQueryDto } from './dto/crop-field-log-query.dto.js';
import { CreateHarvestRecordDto } from './dto/create-harvest-record.dto.js';
import { UpdateHarvestRecordDto } from './dto/update-harvest-record.dto.js';
import { HarvestQueryDto } from './dto/harvest-query.dto.js';
import { CreateFarmExpenseDto } from './dto/create-farm-expense.dto.js';
import { CreateFarmRevenueDto } from './dto/create-farm-revenue.dto.js';
import { FarmFinanceQueryDto } from './dto/farm-finance-query.dto.js';
import { PublicFarmQueryDto } from './dto/public-farm-query.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
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

  // ==========================================
  // FEATURE 2: CROP CYCLES & CULTIVATION PHASES
  // ==========================================

  @Post('farms/:farmId/crop-cycles')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary:
      'Initiate a new crop cultivation cycle on a farm estate with land allocation capacity check',
  })
  @ApiParam({ name: 'farmId', description: 'Farm Estate UUID' })
  @ApiResponse({
    status: 201,
    description: 'Crop cycle initiated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Allocated area exceeds available unallocated farm acreage',
  })
  createCropCycle(
    @Param('farmId') farmId: string,
    @Body() dto: CreateCropCycleDto,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.agricultureService.createCropCycle(farmId, dto, creatorId);
  }

  @Get('farms/:farmId/crop-cycles')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Retrieve paginated list of crop cycles on a farm with stage and crop name filters',
  })
  @ApiParam({ name: 'farmId', description: 'Farm Estate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of crop cycles with harvested yield statistics',
  })
  getFarmCropCycles(
    @Param('farmId') farmId: string,
    @Query() query: CropCycleQueryDto,
  ) {
    return this.agricultureService.getFarmCropCycles(farmId, query);
  }

  @Get('crop-cycles/:id')
  @ApiOperation({
    summary:
      'Get detailed dossier of a single crop cycle (progress, yield attainment %, logs, direct expenses)',
  })
  @ApiParam({ name: 'id', description: 'Crop Cycle UUID' })
  @ApiResponse({
    status: 200,
    description: 'Detailed crop cycle profile and yield analytics',
  })
  @ApiResponse({
    status: 404,
    description: 'Crop cycle not found',
  })
  getCropCycleById(@Param('id') id: string) {
    return this.agricultureService.getCropCycleById(id);
  }

  @Patch('crop-cycles/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary:
      'Update crop cycle stage, allocated area, or harvest dates',
  })
  @ApiParam({ name: 'id', description: 'Crop Cycle UUID' })
  @ApiResponse({
    status: 200,
    description: 'Crop cycle amended successfully',
  })
  updateCropCycle(
    @Param('id') id: string,
    @Body() dto: UpdateCropCycleDto,
    @CurrentUser('id') editorId: string,
  ) {
    return this.agricultureService.updateCropCycle(id, dto, editorId);
  }

  @Delete('crop-cycles/:id')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Delete a crop cycle and cascade delete its field logs and harvest records',
  })
  @ApiParam({ name: 'id', description: 'Crop Cycle UUID' })
  @ApiResponse({
    status: 200,
    description: 'Crop cycle deleted successfully',
  })
  deleteCropCycle(
    @Param('id') id: string,
    @CurrentUser('id') deleterId: string,
  ) {
    return this.agricultureService.deleteCropCycle(id, deleterId);
  }


  // ==========================================
  // FEATURE 3: AGRONOMIC FIELD LOGS & MEDIA
  // ==========================================

  @Post('crop-cycles/:cycleId/logs')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Record an agronomic field observation log (growth %, weather, scouting notes, site photos/media)',
  })
  @ApiParam({ name: 'cycleId', description: 'Crop Cycle UUID' })
  @ApiResponse({
    status: 201,
    description: 'Field observation log recorded successfully',
  })
  createFieldLog(
    @Param('cycleId') cycleId: string,
    @Body() dto: CreateCropFieldLogDto,
    @CurrentUser('id') authorId: string,
  ) {
    return this.agricultureService.createFieldLog(cycleId, dto, authorId);
  }

  @Get('crop-cycles/:cycleId/logs')
  @ApiOperation({
    summary:
      'Retrieve paginated chronological logbook of field observations and photos for a crop cycle',
  })
  @ApiParam({ name: 'cycleId', description: 'Crop Cycle UUID' })
  @ApiResponse({
    status: 200,
    description: 'Chronological field logs and media feed',
  })
  getCropFieldLogs(
    @Param('cycleId') cycleId: string,
    @Query() query: CropFieldLogQueryDto,
  ) {
    return this.agricultureService.getCropFieldLogs(cycleId, query);
  }

  @Get('logs/:id')
  @ApiOperation({
    summary: 'Get details of a single field log and attached media items',
  })
  @ApiParam({ name: 'id', description: 'Field Log UUID' })
  @ApiResponse({
    status: 200,
    description: 'Field log details',
  })
  @ApiResponse({
    status: 404,
    description: 'Field log not found',
  })
  getFieldLogById(@Param('id') id: string) {
    return this.agricultureService.getFieldLogById(id);
  }

  @Patch('logs/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Update field log notes, observations, or attach additional media photos/videos',
  })
  @ApiParam({ name: 'id', description: 'Field Log UUID' })
  @ApiResponse({
    status: 200,
    description: 'Field log amended successfully',
  })
  updateFieldLog(
    @Param('id') id: string,
    @Body() dto: UpdateCropFieldLogDto,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return this.agricultureService.updateFieldLog(id, dto, user.id, roles);
  }

  @Delete('logs/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary: 'Delete a field log and attached media records',
  })
  @ApiParam({ name: 'id', description: 'Field Log UUID' })
  @ApiResponse({
    status: 200,
    description: 'Field log deleted successfully',
  })
  deleteFieldLog(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return this.agricultureService.deleteFieldLog(id, user.id, roles);
  }


  // ==========================================
  // FEATURE 4: HARVEST RECORDS & YIELD TRACKING
  // ==========================================

  @Post('crop-cycles/:cycleId/harvests')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Record a crop harvest batch (yield quantity, quality grade, storage location, estimated value)',
  })
  @ApiParam({ name: 'cycleId', description: 'Crop Cycle UUID' })
  @ApiResponse({
    status: 201,
    description: 'Harvest batch recorded successfully with updated cycle yield analytics',
  })
  recordHarvest(
    @Param('cycleId') cycleId: string,
    @Body() dto: CreateHarvestRecordDto,
    @CurrentUser('id') recorderId: string,
  ) {
    return this.agricultureService.recordHarvest(cycleId, dto, recorderId);
  }

  @Get('crop-cycles/:cycleId/harvests')
  @ApiOperation({
    summary:
      'Retrieve paginated list of harvest batches and cumulative yield for a specific crop cycle',
  })
  @ApiParam({ name: 'cycleId', description: 'Crop Cycle UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated harvest batches for crop cycle',
  })
  getCycleHarvests(
    @Param('cycleId') cycleId: string,
    @Query() query: HarvestQueryDto,
  ) {
    return this.agricultureService.getCycleHarvests(cycleId, query);
  }

  @Get('farms/:farmId/harvests')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Retrieve farm-wide harvest ledger across all crop cycles with quality breakdown',
  })
  @ApiParam({ name: 'farmId', description: 'Farm Estate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Farm-wide harvest ledger',
  })
  getFarmHarvests(
    @Param('farmId') farmId: string,
    @Query() query: HarvestQueryDto,
  ) {
    return this.agricultureService.getFarmHarvests(farmId, query);
  }

  @Get('harvests/:id')
  @ApiOperation({
    summary: 'Get details of a single harvest batch by UUID',
  })
  @ApiParam({ name: 'id', description: 'Harvest Record UUID' })
  @ApiResponse({
    status: 200,
    description: 'Detailed harvest record',
  })
  @ApiResponse({
    status: 404,
    description: 'Harvest record not found',
  })
  getHarvestById(@Param('id') id: string) {
    return this.agricultureService.getHarvestById(id);
  }

  @Patch('harvests/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary: 'Amend a harvest record (quantity, grade, storage location, notes)',
  })
  @ApiParam({ name: 'id', description: 'Harvest Record UUID' })
  @ApiResponse({
    status: 200,
    description: 'Harvest record amended successfully',
  })
  updateHarvest(
    @Param('id') id: string,
    @Body() dto: UpdateHarvestRecordDto,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return this.agricultureService.updateHarvest(id, dto, user.id, roles);
  }

  @Delete('harvests/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary: 'Delete a harvest record from the ledger',
  })
  @ApiParam({ name: 'id', description: 'Harvest Record UUID' })
  @ApiResponse({
    status: 200,
    description: 'Harvest record deleted successfully',
  })
  deleteHarvest(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return this.agricultureService.deleteHarvest(id, user.id, roles);
  }


  // ==========================================
  // FEATURE 5: FARM FINANCIALS & PUBLIC/INVESTOR PORTAL
  // ==========================================

  @Post('farms/:farmId/expenses')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.FINANCE_OFFICER,
  )
  @ApiOperation({
    summary:
      'Record an operating expenditure (seeds, fertilizer, agrochemicals, labour) against a farm budget',
  })
  @ApiParam({ name: 'farmId', description: 'Farm Estate UUID' })
  @ApiResponse({
    status: 201,
    description: 'Farm expense recorded successfully with financial snapshot',
  })
  recordFarmExpense(
    @Param('farmId') farmId: string,
    @Body() dto: CreateFarmExpenseDto,
    @CurrentUser('id') recorderId: string,
  ) {
    return this.agricultureService.recordFarmExpense(farmId, dto, recorderId);
  }

  @Get('farms/:farmId/expenses')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.FINANCE_OFFICER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Retrieve paginated ledger of farm expenditures with category and cycle filters',
  })
  @ApiParam({ name: 'farmId', description: 'Farm Estate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated farm expense records',
  })
  getFarmExpenses(
    @Param('farmId') farmId: string,
    @Query() query: FarmFinanceQueryDto,
  ) {
    return this.agricultureService.getFarmExpenses(farmId, query);
  }

  @Post('farms/:farmId/revenues')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.FINANCE_OFFICER,
  )
  @ApiOperation({
    summary:
      'Record produce sales revenue from harvest off-take or commodity distribution',
  })
  @ApiParam({ name: 'farmId', description: 'Farm Estate UUID' })
  @ApiResponse({
    status: 201,
    description: 'Produce sales revenue recorded successfully',
  })
  recordFarmRevenue(
    @Param('farmId') farmId: string,
    @Body() dto: CreateFarmRevenueDto,
    @CurrentUser('id') recorderId: string,
  ) {
    return this.agricultureService.recordFarmRevenue(farmId, dto, recorderId);
  }

  @Get('farms/:farmId/revenues')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.FINANCE_OFFICER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Retrieve paginated revenue ledger for farm produce sales and bulk transactions',
  })
  @ApiParam({ name: 'farmId', description: 'Farm Estate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated produce sales records',
  })
  getFarmRevenues(
    @Param('farmId') farmId: string,
    @Query() query: FarmFinanceQueryDto,
  ) {
    return this.agricultureService.getFarmRevenues(farmId, query);
  }

  @Get('farms/:farmId/financial-summary')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
    RoleType.FINANCE_OFFICER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Retrieve holistic Farm Profit & Loss (P&L): budget, expenses, sales revenue, net margin %, and category distributions',
  })
  @ApiParam({ name: 'farmId', description: 'Farm Estate UUID' })
  @ApiResponse({
    status: 200,
    description: 'Farm financial P&L summary',
  })
  getFarmFinancialSummary(@Param('farmId') farmId: string) {
    return this.agricultureService.getFarmFinancialSummary(farmId);
  }

  @Public()
  @Get('public/farms')
  @ApiOperation({
    summary:
      'Public discovery: browse active agricultural farm estates, acreage, and active crops (no auth required)',
  })
  @ApiResponse({
    status: 200,
    description: 'Public catalog of agricultural farm estates',
  })
  getPublicFarms(@Query() query: PublicFarmQueryDto) {
    return this.agricultureService.getPublicFarms(query);
  }

  @Public()
  @Get('public/farms/:codeOrId')
  @ApiOperation({
    summary:
      'Public showcase: get detailed public profile of a farm estate by code or UUID (no auth required)',
  })
  @ApiParam({ name: 'codeOrId', description: 'Farm Code (e.g. NK-FARM-XXXXX) or UUID' })
  @ApiResponse({
    status: 200,
    description: 'Detailed public farm profile and crop roadmap',
  })
  @ApiResponse({
    status: 404,
    description: 'Farm estate not found',
  })
  getPublicFarmByCodeOrId(@Param('codeOrId') codeOrId: string) {
    return this.agricultureService.getPublicFarmByCodeOrId(codeOrId);
  }

  @Get('my-farms')
  @ApiOperation({
    summary:
      'Customer / Investor Farmland Portal: retrieve all agricultural assets and farmland investments tied to authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer farmland portfolio and crop tracking',
  })
  getMyFarms(@CurrentUser('id') customerId: string) {
    return this.agricultureService.getCustomerFarms(customerId);
  }

}
