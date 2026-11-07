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
import { ConstructionService } from './construction.service.js';
import { CreateConstructionProjectDto } from './dto/create-construction-project.dto.js';
import { UpdateConstructionProjectDto } from './dto/update-construction-project.dto.js';
import { ConstructionProjectQueryDto } from './dto/construction-project-query.dto.js';
import { CreateMilestoneDto } from './dto/create-milestone.dto.js';
import { UpdateMilestoneDto } from './dto/update-milestone.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Construction Project Tracking')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('construction')
export class ConstructionController {
  constructor(private readonly constructionService: ConstructionService) {}

  @Post('projects')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary:
      'Initialize a new construction project (link to physical property, assign manager, set budget & dates)',
  })
  @ApiResponse({
    status: 201,
    description: 'Construction project initialized successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Project code already in use or invalid project manager',
  })
  createProject(
    @Body() dto: CreateConstructionProjectDto,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.constructionService.createProject(dto, creatorId);
  }

  @Get('projects')
  @ApiOperation({
    summary:
      'List and filter construction projects with live progress percentage and financial summary',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated construction project catalog',
  })
  getProjects(@Query() query: ConstructionProjectQueryDto) {
    return this.constructionService.getProjects(query);
  }

  @Get('projects/:id')
  @ApiOperation({
    summary:
      'Get complete 360-degree construction project dossier (milestones, site updates, media, and budget variance)',
  })
  @ApiParam({
    name: 'id',
    description: 'Project UUID or unique projectCode (e.g. NK-CP-LEK-01)',
  })
  @ApiResponse({
    status: 200,
    description: 'Project dossier details',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  getProjectById(@Param('id') id: string) {
    return this.constructionService.getProjectById(id);
  }

  @Patch('projects/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary:
      'Update project details, budget, timeline, or status (PLANNED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED)',
  })
  @ApiParam({ name: 'id', description: 'Project UUID or projectCode' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
  })
  updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateConstructionProjectDto,
    @CurrentUser('id') editorId: string,
  ) {
    return this.constructionService.updateProject(id, dto, editorId);
  }

  @Delete('projects/:id')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Cancel or delete a construction project (soft-cancels if operational history exists)',
  })
  @ApiParam({ name: 'id', description: 'Project UUID or projectCode' })
  @ApiResponse({
    status: 200,
    description: 'Project cancelled or deleted successfully',
  })
  deleteProject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.constructionService.deleteProject(id, adminId);
  }

  // ==========================================
  // MILESTONES & WORK BREAKDOWN STRUCTURE (WBS)
  // ==========================================

  @Post('projects/:projectId/milestones')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary:
      'Add a new milestone / construction phase to a project (percentage weight, sequence, dates)',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID or projectCode' })
  @ApiResponse({
    status: 201,
    description: 'Milestone created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Milestone weight exceeds remaining project allocation',
  })
  createMilestone(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.constructionService.createMilestone(projectId, dto, creatorId);
  }

  @Get('projects/:projectId/milestones')
  @ApiOperation({
    summary:
      'List all milestones for a project in sequential order with status and completion weights',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID or projectCode' })
  @ApiResponse({
    status: 200,
    description: 'List of project milestones',
  })
  getProjectMilestones(@Param('projectId') projectId: string) {
    return this.constructionService.getProjectMilestones(projectId);
  }

  @Get('milestones/:id')
  @ApiOperation({
    summary: 'Get single milestone details by ID',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone details',
  })
  @ApiResponse({
    status: 404,
    description: 'Milestone not found',
  })
  getMilestoneById(@Param('id') id: string) {
    return this.constructionService.getMilestoneById(id);
  }

  @Patch('milestones/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary:
      'Update milestone status, name, sequence, or percentage weight (auto-sets completedAt when marked COMPLETED)',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone updated successfully',
  })
  updateMilestone(
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser('id') editorId: string,
  ) {
    return this.constructionService.updateMilestone(id, dto, editorId);
  }

  @Delete('milestones/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
  )
  @ApiOperation({
    summary: 'Delete a milestone from a project',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone deleted successfully',
  })
  deleteMilestone(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.constructionService.deleteMilestone(id, adminId);
  }
}
