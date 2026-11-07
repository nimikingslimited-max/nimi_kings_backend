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
import { CreateProjectUpdateDto } from './dto/create-project-update.dto.js';
import { UpdateProjectUpdateDto } from './dto/update-project-update.dto.js';
import { ProjectUpdateQueryDto } from './dto/project-update-query.dto.js';
import { CreateProjectExpenseDto } from './dto/create-project-expense.dto.js';
import { UpdateProjectExpenseDto } from './dto/update-project-expense.dto.js';
import { ProjectExpenseQueryDto } from './dto/project-expense-query.dto.js';
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

  // ==========================================
  // FEATURE 3: FIELD PROGRESS UPDATES & MEDIA
  // ==========================================

  @Post('projects/:projectId/updates')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Record a field progress update (% completion, engineering notes, photos/media)',
  })
  @ApiParam({ name: 'projectId', description: 'Construction Project UUID' })
  @ApiResponse({
    status: 201,
    description: 'Field progress update logged successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  createProjectUpdate(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectUpdateDto,
    @CurrentUser('id') authorId: string,
  ) {
    return this.constructionService.createProjectUpdate(projectId, dto, authorId);
  }

  @Get('projects/:projectId/updates')
  @ApiOperation({
    summary:
      'Retrieve paginated timeline of field progress updates with attached site media',
  })
  @ApiParam({ name: 'projectId', description: 'Construction Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated timeline of project updates',
  })
  getProjectUpdates(
    @Param('projectId') projectId: string,
    @Query() query: ProjectUpdateQueryDto,
  ) {
    return this.constructionService.getProjectUpdates(projectId, query);
  }

  @Get('updates/:id')
  @ApiOperation({
    summary:
      'Get details of a single progress update, author info, and all media attachments',
  })
  @ApiParam({ name: 'id', description: 'Project Update UUID' })
  @ApiResponse({
    status: 200,
    description: 'Detailed progress update record',
  })
  @ApiResponse({
    status: 404,
    description: 'Update record not found',
  })
  getProjectUpdateById(@Param('id') id: string) {
    return this.constructionService.getProjectUpdateById(id);
  }

  @Patch('updates/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Update a progress update title, notes, or attach additional media photos/videos',
  })
  @ApiParam({ name: 'id', description: 'Project Update UUID' })
  @ApiResponse({
    status: 200,
    description: 'Progress update amended successfully',
  })
  updateProjectUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateProjectUpdateDto,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return this.constructionService.updateProjectUpdate(id, dto, user.id, roles);
  }

  @Delete('updates/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.PROPERTY_MANAGER,
    RoleType.AGENT,
  )
  @ApiOperation({
    summary:
      'Delete a field progress update and associated media records',
  })
  @ApiParam({ name: 'id', description: 'Project Update UUID' })
  @ApiResponse({
    status: 200,
    description: 'Progress update deleted successfully',
  })
  deleteProjectUpdate(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return this.constructionService.deleteProjectUpdate(id, user.id, roles);
  }


  // ==========================================
  // FEATURE 4: FINANCIALS & EXPENSE LEDGER
  // ==========================================

  @Post('projects/:projectId/expenses')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.FINANCE_OFFICER,
  )
  @ApiOperation({
    summary:
      'Record an expenditure against a project budget in the financial ledger',
  })
  @ApiParam({ name: 'projectId', description: 'Construction Project UUID' })
  @ApiResponse({
    status: 201,
    description: 'Expense logged successfully with updated financial snapshot',
  })
  recordExpense(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectExpenseDto,
    @CurrentUser('id') recorderId: string,
  ) {
    return this.constructionService.recordExpense(projectId, dto, recorderId);
  }

  @Get('projects/:projectId/expenses')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.FINANCE_OFFICER,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary:
      'Retrieve paginated expense ledger for a project with category, date, and amount filters',
  })
  @ApiParam({ name: 'projectId', description: 'Construction Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated expense records',
  })
  getProjectExpenses(
    @Param('projectId') projectId: string,
    @Query() query: ProjectExpenseQueryDto,
  ) {
    return this.constructionService.getProjectExpenses(projectId, query);
  }

  @Get('projects/:projectId/financial-summary')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.FINANCE_OFFICER,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary:
      'Retrieve holistic financial health summary (budget, actual spend, variance, % utilization, category breakdown)',
  })
  @ApiParam({ name: 'projectId', description: 'Construction Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive financial health report',
  })
  getProjectFinancialSummary(@Param('projectId') projectId: string) {
    return this.constructionService.getProjectFinancialSummary(projectId);
  }

  @Get('expenses/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.FINANCE_OFFICER,
    RoleType.PROPERTY_MANAGER,
  )
  @ApiOperation({
    summary: 'Get details of a single recorded expenditure by UUID',
  })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({
    status: 200,
    description: 'Expense record details',
  })
  @ApiResponse({
    status: 404,
    description: 'Expense record not found',
  })
  getExpenseById(@Param('id') id: string) {
    return this.constructionService.getExpenseById(id);
  }

  @Patch('expenses/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.CONSTRUCTION_MANAGER,
    RoleType.FINANCE_OFFICER,
  )
  @ApiOperation({
    summary: 'Update an existing expense entry (amount, category, description, date)',
  })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({
    status: 200,
    description: 'Expense record updated successfully',
  })
  updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateProjectExpenseDto,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return this.constructionService.updateExpense(id, dto, user.id, roles);
  }

  @Delete('expenses/:id')
  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.FINANCE_OFFICER,
  )
  @ApiOperation({
    summary: 'Delete an expense record from the ledger',
  })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({
    status: 200,
    description: 'Expense record deleted successfully',
  })
  deleteExpense(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return this.constructionService.deleteExpense(id, user.id, roles);
  }

}
