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
import { InspectionsService } from './inspections.service.js';
import { CreateInspectionDto } from './dto/create-inspection.dto.js';
import { UpdateInspectionDto } from './dto/update-inspection.dto.js';
import { AssignPropertyAgentDto } from './dto/assign-property-agent.dto.js';
import { InspectionQueryDto } from './dto/inspection-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Inspections & Agent Assignments')
@ApiBearerAuth('JWT-auth')
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Request a physical site inspection (auto-assigns property agent if available)',
  })
  @ApiResponse({
    status: 201,
    description: 'Site inspection requested successfully',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  create(
    @Body() dto: CreateInspectionDto,
    @CurrentUser('id') customerId: string,
  ) {
    return this.inspectionsService.create(dto, customerId);
  }

  @Get('my-inspections')
  @ApiOperation({
    summary: 'Get authenticated customer scheduled and past site inspections',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of customer inspections',
  })
  findMyInspections(
    @CurrentUser('id') customerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inspectionsService.findMyInspections(
      customerId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Roles(
    RoleType.PROPERTY_MANAGER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Post('property-agents')
  @ApiOperation({
    summary: 'Assign a dedicated field agent to a property',
  })
  @ApiResponse({
    status: 201,
    description: 'Agent assigned to property for automatic lead routing',
  })
  assignAgentToProperty(
    @Body() dto: AssignPropertyAgentDto,
    @CurrentUser('id') assignerId: string,
  ) {
    return this.inspectionsService.assignAgentToProperty(dto, assignerId);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.PROPERTY_MANAGER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Get('property-agents/:propertyId')
  @ApiOperation({
    summary: 'Get all active agents assigned to a specific property',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active agents assigned to the property',
  })
  getPropertyAgents(@Param('propertyId') propertyId: string) {
    return this.inspectionsService.getPropertyAgents(propertyId);
  }

  @Roles(
    RoleType.PROPERTY_MANAGER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Delete('property-agents/:propertyId/:agentId')
  @ApiOperation({
    summary: 'Unassign a field agent from a property',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent unassigned from property',
  })
  removeAgentFromProperty(
    @Param('propertyId') propertyId: string,
    @Param('agentId') agentId: string,
    @CurrentUser('id') removerId: string,
  ) {
    return this.inspectionsService.removeAgentFromProperty(
      propertyId,
      agentId,
      removerId,
    );
  }

  @Roles(
    RoleType.AGENT,
    RoleType.PROPERTY_MANAGER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Get()
  @ApiOperation({
    summary:
      'List and filter site inspections (Agents see their assigned visits; Admins see all)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of site inspections',
  })
  findAll(@Query() query: InspectionQueryDto, @CurrentUser() user: any) {
    return this.inspectionsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single site inspection details by ID' })
  @ApiResponse({ status: 200, description: 'Inspection details' })
  @ApiResponse({ status: 404, description: 'Inspection not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inspectionsService.findOne(id, user);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.PROPERTY_MANAGER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Patch(':id')
  @ApiOperation({
    summary:
      'Confirm, reschedule, assign agent, or mark a site inspection as completed',
  })
  @ApiResponse({
    status: 200,
    description: 'Inspection updated',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInspectionDto,
    @CurrentUser() user: any,
  ) {
    return this.inspectionsService.update(id, dto, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an upcoming site inspection (Customer self-service)',
  })
  @ApiResponse({
    status: 200,
    description: 'Inspection cancelled',
  })
  cancelByCustomer(
    @Param('id') id: string,
    @CurrentUser('id') customerId: string,
  ) {
    return this.inspectionsService.cancelByCustomer(id, customerId);
  }
}
