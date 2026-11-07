import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
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

@Injectable()
export class ConstructionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Initialize a new construction project and assign initial parameters.
   */
  async createProject(dto: CreateConstructionProjectDto, creatorId: string) {
    if (dto.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, deletedAt: null },
      });
      if (!property) {
        throw new NotFoundException(`Property with ID '${dto.propertyId}' not found`);
      }
    }

    if (dto.projectManagerId) {
      const pm = await this.prisma.user.findUnique({
        where: { id: dto.projectManagerId },
      });
      if (!pm || pm.status !== 'ACTIVE') {
        throw new BadRequestException('Project Manager must be an active registered user');
      }
    }

    const projectCode =
      dto.projectCode?.trim() ||
      `NK-CP-${Date.now().toString(36).toUpperCase().slice(-5)}`;

    const existingCode = await this.prisma.constructionProject.findUnique({
      where: { projectCode },
    });
    if (existingCode) {
      throw new BadRequestException(`Project code '${projectCode}' is already in use`);
    }

    const project = await this.prisma.constructionProject.create({
      data: {
        projectCode,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        propertyId: dto.propertyId || null,
        projectManagerId: dto.projectManagerId || null,
        status: dto.status || 'PLANNED',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : null,
        budget: dto.budget,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            propertyCode: true,
            address: true,
            city: true,
            state: true,
          },
        },
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: creatorId,
      action: 'CONSTRUCTION_PROJECT_CREATED',
      entityType: 'ConstructionProject',
      entityId: project.id,
      newValues: {
        projectCode: project.projectCode,
        name: project.name,
        budget: project.budget,
        status: project.status,
      },
    });

    return {
      message: 'Construction project initialized successfully',
      project: {
        ...project,
        budget: Number(project.budget),
      },
    };
  }

  /**
   * List and filter construction projects with aggregate progress and financials.
   */
  async getProjects(query: ConstructionProjectQueryDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(Number(query.limit), 100) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ConstructionProjectWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { projectCode: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    if (query.projectManagerId) {
      where.projectManagerId = query.projectManagerId;
    }

    const validSortFields = ['createdAt', 'startDate', 'expectedEndDate', 'budget', 'name'];
    const sortBy = validSortFields.includes(query.sortBy || '') ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, projects] = await Promise.all([
      this.prisma.constructionProject.count({ where }),
      this.prisma.constructionProject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy!]: sortOrder },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              propertyCode: true,
              address: true,
              city: true,
              state: true,
            },
          },
          projectManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          milestones: {
            select: {
              id: true,
              name: true,
              percentage: true,
              status: true,
              sequence: true,
            },
          },
          updates: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              progressPercentage: true,
              createdAt: true,
              title: true,
            },
          },
          expenses: {
            select: {
              amount: true,
            },
          },
          _count: {
            select: {
              milestones: true,
              updates: true,
              expenses: true,
            },
          },
        },
      }),
    ]);

    const items = projects.map((p) => {
      const budgetNum = Number(p.budget);
      const totalExpenses = p.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const remainingBudget = Math.max(0, budgetNum - totalExpenses);

      // Determine progress percentage
      let progressPercentage = 0;
      if (p.updates.length > 0) {
        progressPercentage = Number(p.updates[0].progressPercentage);
      } else if (p.milestones.length > 0) {
        const completedWeight = p.milestones
          .filter((m) => m.status === 'COMPLETED')
          .reduce((sum, m) => sum + Number(m.percentage), 0);
        progressPercentage = Math.min(100, completedWeight);
      } else if (p.status === 'COMPLETED') {
        progressPercentage = 100;
      }

      return {
        id: p.id,
        projectCode: p.projectCode,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        expectedEndDate: p.expectedEndDate,
        actualEndDate: p.actualEndDate,
        budget: budgetNum,
        financials: {
          totalExpenses,
          remainingBudget,
          burnRatePercentage: budgetNum > 0 ? Number(((totalExpenses / budgetNum) * 100).toFixed(1)) : 0,
        },
        progressPercentage: Number(progressPercentage.toFixed(1)),
        property: p.property,
        projectManager: p.projectManager,
        counts: {
          milestones: p._count.milestones,
          updates: p._count.updates,
          expenses: p._count.expenses,
        },
        latestUpdate: p.updates[0] || null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get complete 360-degree project dossier with milestones, updates, photos, and expense ledger.
   */
  async getProjectById(id: string) {
    const project = await this.prisma.constructionProject.findFirst({
      where: {
        OR: [{ id }, { projectCode: id }],
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            propertyCode: true,
            propertyType: true,
            address: true,
            city: true,
            state: true,
            media: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        milestones: {
          orderBy: { sequence: 'asc' },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            media: true,
          },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 10,
          include: {
            recordedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: {
            milestones: true,
            updates: true,
            expenses: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Construction project '${id}' not found`);
    }

    const expenseAggregate = await this.prisma.projectExpense.aggregate({
      where: { projectId: project.id },
      _sum: { amount: true },
    });

    const budgetNum = Number(project.budget);
    const totalExpenses = expenseAggregate._sum.amount
      ? Number(expenseAggregate._sum.amount)
      : 0;
    const remainingBudget = Math.max(0, budgetNum - totalExpenses);
    const burnRate =
      budgetNum > 0 ? Number(((totalExpenses / budgetNum) * 100).toFixed(1)) : 0;

    let progressPercentage = 0;
    if (project.updates.length > 0) {
      progressPercentage = Number(project.updates[0].progressPercentage);
    } else if (project.milestones.length > 0) {
      const completedWeight = project.milestones
        .filter((m) => m.status === 'COMPLETED')
        .reduce((sum, m) => sum + Number(m.percentage), 0);
      progressPercentage = Math.min(100, completedWeight);
    } else if (project.status === 'COMPLETED') {
      progressPercentage = 100;
    }

    return {
      project: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        expectedEndDate: project.expectedEndDate,
        actualEndDate: project.actualEndDate,
        budget: budgetNum,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      property: project.property
        ? {
            ...project.property,
            primaryImage: project.property.media[0]?.url || null,
          }
        : null,
      projectManager: project.projectManager,
      financials: {
        budget: budgetNum,
        totalExpenses,
        remainingBudget,
        burnRatePercentage: burnRate,
        currency: 'NGN',
      },
      progress: {
        overallPercentage: Number(progressPercentage.toFixed(1)),
        totalMilestones: project.milestones.length,
        completedMilestones: project.milestones.filter((m) => m.status === 'COMPLETED').length,
        inProgressMilestones: project.milestones.filter((m) => m.status === 'IN_PROGRESS').length,
      },
      milestones: project.milestones.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        sequence: m.sequence,
        percentageWeight: Number(m.percentage),
        status: m.status,
        startDate: m.startDate,
        expectedEndDate: m.expectedEndDate,
        completedAt: m.completedAt,
      })),
      recentUpdates: project.updates.map((u) => ({
        id: u.id,
        title: u.title,
        description: u.description,
        progressPercentage: Number(u.progressPercentage),
        author: `${u.createdBy.firstName} ${u.createdBy.lastName}`,
        createdAt: u.createdAt,
        media: u.media.map((med) => ({
          id: med.id,
          type: med.type,
          url: med.url,
        })),
      })),
      recentExpenses: project.expenses.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        currency: e.currency,
        expenseDate: e.expenseDate,
        recordedBy: `${e.recordedBy.firstName} ${e.recordedBy.lastName}`,
      })),
    };
  }

  /**
   * Update project details, budget, timeline, or status.
   */
  async updateProject(id: string, dto: UpdateConstructionProjectDto, editorId: string) {
    const project = await this.prisma.constructionProject.findFirst({
      where: {
        OR: [{ id }, { projectCode: id }],
      },
    });

    if (!project) {
      throw new NotFoundException(`Construction project '${id}' not found`);
    }

    if (dto.propertyId && dto.propertyId !== project.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, deletedAt: null },
      });
      if (!property) {
        throw new NotFoundException(`Property with ID '${dto.propertyId}' not found`);
      }
    }

    if (dto.projectManagerId && dto.projectManagerId !== project.projectManagerId) {
      const pm = await this.prisma.user.findUnique({
        where: { id: dto.projectManagerId },
      });
      if (!pm || pm.status !== 'ACTIVE') {
        throw new BadRequestException('Project Manager must be an active registered user');
      }
    }

    const oldValues = {
      name: project.name,
      status: project.status,
      budget: project.budget,
      startDate: project.startDate,
      expectedEndDate: project.expectedEndDate,
      actualEndDate: project.actualEndDate,
      projectManagerId: project.projectManagerId,
      propertyId: project.propertyId,
    };

    const isMarkingCompleted = dto.status === 'COMPLETED' && project.status !== 'COMPLETED';
    const actualEndDate = dto.actualEndDate
      ? new Date(dto.actualEndDate)
      : isMarkingCompleted
        ? new Date()
        : project.actualEndDate;

    const updated = await this.prisma.constructionProject.update({
      where: { id: project.id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        propertyId: dto.propertyId !== undefined ? dto.propertyId : undefined,
        projectManagerId: dto.projectManagerId !== undefined ? dto.projectManagerId : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
        expectedEndDate:
          dto.expectedEndDate !== undefined ? new Date(dto.expectedEndDate) : undefined,
        actualEndDate,
        budget: dto.budget !== undefined ? dto.budget : undefined,
      },
      include: {
        property: {
          select: { id: true, title: true, propertyCode: true },
        },
        projectManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await this.auditService.log({
      userId: editorId,
      action: 'CONSTRUCTION_PROJECT_UPDATED',
      entityType: 'ConstructionProject',
      entityId: project.id,
      oldValues,
      newValues: {
        name: updated.name,
        status: updated.status,
        budget: updated.budget,
        actualEndDate: updated.actualEndDate,
      },
    });

    return {
      message: 'Construction project updated successfully',
      project: {
        ...updated,
        budget: Number(updated.budget),
      },
    };
  }

  /**
   * Cancel or delete a construction project.
   */
  async deleteProject(id: string, adminId: string) {
    const project = await this.prisma.constructionProject.findFirst({
      where: {
        OR: [{ id }, { projectCode: id }],
      },
      include: {
        _count: {
          select: {
            milestones: true,
            updates: true,
            expenses: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Construction project '${id}' not found`);
    }

    const hasOperationalData =
      project._count.milestones > 0 ||
      project._count.updates > 0 ||
      project._count.expenses > 0;

    if (hasOperationalData) {
      // Soft-cancel to preserve audit and financial history
      await this.prisma.constructionProject.update({
        where: { id: project.id },
        data: {
          status: 'CANCELLED',
        },
      });

      await this.auditService.log({
        userId: adminId,
        action: 'CONSTRUCTION_PROJECT_CANCELLED',
        entityType: 'ConstructionProject',
        entityId: project.id,
        newValues: { status: 'CANCELLED', reason: 'Project cancelled with existing operational history' },
      });

      return {
        message: `Project '${project.projectCode}' has existing milestones/expenses and has been marked as CANCELLED to preserve audit records`,
        projectCode: project.projectCode,
        status: 'CANCELLED',
      };
    } else {
      // Hard delete pristine project
      await this.prisma.constructionProject.delete({
        where: { id: project.id },
      });

      await this.auditService.log({
        userId: adminId,
        action: 'CONSTRUCTION_PROJECT_DELETED',
        entityType: 'ConstructionProject',
        entityId: project.id,
        oldValues: { projectCode: project.projectCode, name: project.name },
      });

      return {
        message: `Construction project '${project.projectCode}' deleted successfully`,
        projectCode: project.projectCode,
      };
    }
  }

  // ==========================================
  // MILESTONES & WORK BREAKDOWN STRUCTURE (WBS)
  // ==========================================

  /**
   * Add a milestone / work breakdown phase to a project with sequence and completion percentage weight.
   */
  async createMilestone(projectId: string, dto: CreateMilestoneDto, creatorId: string) {
    const project = await this.prisma.constructionProject.findFirst({
      where: {
        OR: [{ id: projectId }, { projectCode: projectId }],
      },
      include: {
        milestones: {
          select: { percentage: true, sequence: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Construction project '${projectId}' not found`);
    }

    const currentTotalWeight = project.milestones.reduce(
      (sum, m) => sum + Number(m.percentage),
      0,
    );
    const newTotalWeight = currentTotalWeight + dto.percentage;

    if (newTotalWeight > 100.01) {
      throw new BadRequestException(
        `Total milestone weight cannot exceed 100.00%. Current allocated weight is ${currentTotalWeight.toFixed(2)}%, and adding ${dto.percentage.toFixed(2)}% would equal ${newTotalWeight.toFixed(2)}%.`,
      );
    }

    const sequence = dto.sequence || project.milestones.length + 1;

    const milestone = await this.prisma.constructionMilestone.create({
      data: {
        projectId: project.id,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        sequence,
        percentage: dto.percentage,
        status: dto.status || 'PLANNED',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : null,
      },
    });

    await this.auditService.log({
      userId: creatorId,
      action: 'CONSTRUCTION_MILESTONE_CREATED',
      entityType: 'ConstructionMilestone',
      entityId: milestone.id,
      newValues: {
        projectId: project.id,
        projectCode: project.projectCode,
        name: milestone.name,
        percentage: milestone.percentage,
        sequence: milestone.sequence,
      },
    });

    return {
      message: 'Milestone created successfully',
      milestone: {
        ...milestone,
        percentage: Number(milestone.percentage),
      },
      projectWeightAllocation: {
        allocatedWeightPercentage: Number(newTotalWeight.toFixed(2)),
        remainingWeightPercentage: Number(Math.max(0, 100 - newTotalWeight).toFixed(2)),
      },
    };
  }

  /**
   * List all milestones for a project in sequential order with status and weight metrics.
   */
  async getProjectMilestones(projectId: string) {
    const project = await this.prisma.constructionProject.findFirst({
      where: {
        OR: [{ id: projectId }, { projectCode: projectId }],
      },
    });

    if (!project) {
      throw new NotFoundException(`Construction project '${projectId}' not found`);
    }

    const milestones = await this.prisma.constructionMilestone.findMany({
      where: { projectId: project.id },
      orderBy: { sequence: 'asc' },
      include: {
        _count: {
          select: { updates: true },
        },
      },
    });

    const totalWeight = milestones.reduce((sum, m) => sum + Number(m.percentage), 0);
    const completedWeight = milestones
      .filter((m) => m.status === 'COMPLETED')
      .reduce((sum, m) => sum + Number(m.percentage), 0);

    return {
      projectId: project.id,
      projectCode: project.projectCode,
      projectName: project.name,
      summary: {
        totalMilestones: milestones.length,
        completedMilestones: milestones.filter((m) => m.status === 'COMPLETED').length,
        inProgressMilestones: milestones.filter((m) => m.status === 'IN_PROGRESS').length,
        allocatedWeightPercentage: Number(totalWeight.toFixed(2)),
        completedPercentage: Number(completedWeight.toFixed(2)),
      },
      milestones: milestones.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        sequence: m.sequence,
        percentage: Number(m.percentage),
        status: m.status,
        startDate: m.startDate,
        expectedEndDate: m.expectedEndDate,
        completedAt: m.completedAt,
        updatesCount: m._count.updates,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  }

  /**
   * Get single milestone details with project association and related updates.
   */
  async getMilestoneById(id: string) {
    const milestone = await this.prisma.constructionMilestone.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            status: true,
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            media: true,
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID '${id}' not found`);
    }

    return {
      milestone: {
        ...milestone,
        percentage: Number(milestone.percentage),
      },
    };
  }

  /**
   * Update milestone properties, sequence, weight, or lifecycle status.
   */
  async updateMilestone(id: string, dto: UpdateMilestoneDto, editorId: string) {
    const milestone = await this.prisma.constructionMilestone.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            milestones: {
              select: { id: true, percentage: true },
            },
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID '${id}' not found`);
    }

    if (dto.percentage !== undefined) {
      const otherMilestonesWeight = milestone.project.milestones
        .filter((m) => m.id !== id)
        .reduce((sum, m) => sum + Number(m.percentage), 0);
      const newTotal = otherMilestonesWeight + dto.percentage;

      if (newTotal > 100.01) {
        throw new BadRequestException(
          `Updated percentage of ${dto.percentage}% would bring total project milestone weight to ${newTotal.toFixed(2)}%, exceeding 100.00%.`,
        );
      }
    }

    const isMarkingCompleted = dto.status === 'COMPLETED' && milestone.status !== 'COMPLETED';
    const isUnmarkingCompleted = dto.status && dto.status !== 'COMPLETED' && milestone.status === 'COMPLETED';

    const completedAt = dto.completedAt
      ? new Date(dto.completedAt)
      : isMarkingCompleted
        ? new Date()
        : isUnmarkingCompleted
          ? null
          : milestone.completedAt;

    const oldValues = {
      name: milestone.name,
      status: milestone.status,
      percentage: milestone.percentage,
      sequence: milestone.sequence,
      completedAt: milestone.completedAt,
    };

    const updated = await this.prisma.constructionMilestone.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        sequence: dto.sequence !== undefined ? dto.sequence : undefined,
        percentage: dto.percentage !== undefined ? dto.percentage : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
        expectedEndDate:
          dto.expectedEndDate !== undefined ? new Date(dto.expectedEndDate) : undefined,
        completedAt,
      },
    });

    await this.auditService.log({
      userId: editorId,
      action: 'CONSTRUCTION_MILESTONE_UPDATED',
      entityType: 'ConstructionMilestone',
      entityId: id,
      oldValues,
      newValues: {
        name: updated.name,
        status: updated.status,
        percentage: updated.percentage,
        completedAt: updated.completedAt,
      },
    });

    return {
      message: 'Milestone updated successfully',
      milestone: {
        ...updated,
        percentage: Number(updated.percentage),
      },
    };
  }

  /**
   * Delete a milestone from a project.
   */
  async deleteMilestone(id: string, adminId: string) {
    const milestone = await this.prisma.constructionMilestone.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, projectCode: true },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID '${id}' not found`);
    }

    await this.prisma.constructionMilestone.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'CONSTRUCTION_MILESTONE_DELETED',
      entityType: 'ConstructionMilestone',
      entityId: id,
      oldValues: {
        projectId: milestone.projectId,
        name: milestone.name,
        percentage: milestone.percentage,
      },
    });

    return {
      message: `Milestone '${milestone.name}' deleted successfully`,
      id,
      projectId: milestone.projectId,
    };
  }

  // ==========================================
  // FEATURE 3: FIELD PROGRESS UPDATES & MEDIA
  // ==========================================

  /**
   * Record a new field progress update with % completion, observations, and site media.
   */
  async createProjectUpdate(
    projectId: string,
    dto: CreateProjectUpdateDto,
    authorId: string,
  ) {
    const project = await this.prisma.constructionProject.findUnique({
      where: { id: projectId },
      include: {
        property: {
          select: { id: true, title: true, createdById: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Construction project with ID '${projectId}' not found`);
    }

    if (dto.milestoneId) {
      const milestone = await this.prisma.constructionMilestone.findFirst({
        where: { id: dto.milestoneId, projectId },
      });
      if (!milestone) {
        throw new BadRequestException(
          `Milestone with ID '${dto.milestoneId}' does not belong to project '${projectId}'`,
        );
      }
    }

    // Advance project status if still in PLANNED state
    if (project.status === 'PLANNED') {
      await this.prisma.constructionProject.update({
        where: { id: projectId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    const createdUpdate = await this.prisma.projectUpdate.create({
      data: {
        projectId,
        milestoneId: dto.milestoneId || null,
        createdById: authorId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        progressPercentage: dto.progressPercentage,
        media:
          dto.media && dto.media.length > 0
            ? {
                create: dto.media.map((m) => ({
                  type: m.type || 'IMAGE',
                  url: m.url.trim(),
                  storageKey: m.storageKey.trim(),
                })),
              }
            : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            sequence: true,
            percentage: true,
            status: true,
          },
        },
        media: true,
      },
    });

    await this.auditService.log({
      userId: authorId,
      action: 'CONSTRUCTION_UPDATE_CREATED',
      entityType: 'ProjectUpdate',
      entityId: createdUpdate.id,
      newValues: {
        projectId,
        title: createdUpdate.title,
        progressPercentage: createdUpdate.progressPercentage,
        milestoneId: createdUpdate.milestoneId,
        mediaCount: createdUpdate.media.length,
      },
    });

    // Notify Project Manager and Property Owner if distinct from author
    const notificationRecipients = new Set<string>();
    if (project.projectManagerId && project.projectManagerId !== authorId) {
      notificationRecipients.add(project.projectManagerId);
    }
    if (project.property?.createdById && project.property.createdById !== authorId) {
      notificationRecipients.add(project.property.createdById);
    }

    for (const recipientId of notificationRecipients) {
      await this.prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'PROJECT_UPDATE',
          title: `Progress Update: ${project.name}`,
          message: `${createdUpdate.title} - Progress logged at ${Number(createdUpdate.progressPercentage).toFixed(1)}%`,
          data: {
            projectId,
            updateId: createdUpdate.id,
            progressPercentage: Number(createdUpdate.progressPercentage),
          },
        },
      });
    }

    return {
      message: 'Project field progress update recorded successfully',
      update: {
        id: createdUpdate.id,
        projectId: createdUpdate.projectId,
        title: createdUpdate.title,
        description: createdUpdate.description,
        progressPercentage: Number(createdUpdate.progressPercentage),
        createdAt: createdUpdate.createdAt,
        author: createdUpdate.createdBy,
        milestone: createdUpdate.milestone
          ? {
              ...createdUpdate.milestone,
              percentage: Number(createdUpdate.milestone.percentage),
            }
          : null,
        media: createdUpdate.media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          storageKey: m.storageKey,
        })),
      },
    };
  }

  /**
   * Retrieve timeline of field progress updates for a project with pagination and milestone filter.
   */
  async getProjectUpdates(projectId: string, query: ProjectUpdateQueryDto) {
    const project = await this.prisma.constructionProject.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, projectCode: true, status: true },
    });

    if (!project) {
      throw new NotFoundException(`Construction project with ID '${projectId}' not found`);
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectUpdateWhereInput = {
      projectId,
    };

    if (query.milestoneId) {
      where.milestoneId = query.milestoneId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [updates, total] = await Promise.all([
      this.prisma.projectUpdate.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          milestone: {
            select: {
              id: true,
              name: true,
              sequence: true,
              percentage: true,
              status: true,
            },
          },
          media: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.projectUpdate.count({ where }),
    ]);

    const latestUpdate = updates[0];

    return {
      project,
      updates: updates.map((u) => ({
        id: u.id,
        title: u.title,
        description: u.description,
        progressPercentage: Number(u.progressPercentage),
        createdAt: u.createdAt,
        author: u.createdBy,
        milestone: u.milestone
          ? {
              ...u.milestone,
              percentage: Number(u.milestone.percentage),
            }
          : null,
        media: u.media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          storageKey: m.storageKey,
        })),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
        latestProgressPercentage: latestUpdate
          ? Number(latestUpdate.progressPercentage)
          : null,
      },
    };
  }

  /**
   * Get single progress update with detailed metadata and media attachments.
   */
  async getProjectUpdateById(updateId: string) {
    const update = await this.prisma.projectUpdate.findUnique({
      where: { id: updateId },
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            status: true,
            budget: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            sequence: true,
            percentage: true,
            status: true,
          },
        },
        media: true,
      },
    });

    if (!update) {
      throw new NotFoundException(`Project update with ID '${updateId}' not found`);
    }

    return {
      id: update.id,
      project: {
        id: update.project.id,
        projectCode: update.project.projectCode,
        name: update.project.name,
        status: update.project.status,
        budget: Number(update.project.budget),
      },
      title: update.title,
      description: update.description,
      progressPercentage: Number(update.progressPercentage),
      createdAt: update.createdAt,
      author: update.createdBy,
      milestone: update.milestone
        ? {
            ...update.milestone,
            percentage: Number(update.milestone.percentage),
          }
        : null,
      media: update.media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        storageKey: m.storageKey,
      })),
    };
  }

  /**
   * Update an existing progress update or attach additional site media.
   */
  async updateProjectUpdate(
    updateId: string,
    dto: UpdateProjectUpdateDto,
    editorId: string,
    userRoles: string[],
  ) {
    const existing = await this.prisma.projectUpdate.findUnique({
      where: { id: updateId },
      include: { media: true },
    });

    if (!existing) {
      throw new NotFoundException(`Project update with ID '${updateId}' not found`);
    }

    const isAdmin = userRoles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'CONSTRUCTION_MANAGER'].includes(r.toUpperCase()),
    );
    if (!isAdmin && existing.createdById !== editorId) {
      throw new ForbiddenException(
        'Only an administrator, construction manager, or the author can update this record',
      );
    }

    if (dto.milestoneId && dto.milestoneId !== existing.milestoneId) {
      const milestone = await this.prisma.constructionMilestone.findFirst({
        where: { id: dto.milestoneId, projectId: existing.projectId },
      });
      if (!milestone) {
        throw new BadRequestException(
          `Milestone '${dto.milestoneId}' does not belong to this project`,
        );
      }
    }

    if (dto.newMedia && dto.newMedia.length > 0) {
      await this.prisma.projectUpdateMedia.createMany({
        data: dto.newMedia.map((m) => ({
          projectUpdateId: updateId,
          type: m.type || 'IMAGE',
          url: m.url.trim(),
          storageKey: m.storageKey.trim(),
        })),
      });
    }

    const updated = await this.prisma.projectUpdate.update({
      where: { id: updateId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        progressPercentage:
          dto.progressPercentage !== undefined ? dto.progressPercentage : undefined,
        milestoneId:
          dto.milestoneId !== undefined ? dto.milestoneId : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            sequence: true,
            percentage: true,
            status: true,
          },
        },
        media: true,
      },
    });

    await this.auditService.log({
      userId: editorId,
      action: 'CONSTRUCTION_UPDATE_UPDATED',
      entityType: 'ProjectUpdate',
      entityId: updateId,
      oldValues: {
        title: existing.title,
        progressPercentage: existing.progressPercentage,
      },
      newValues: {
        title: updated.title,
        progressPercentage: updated.progressPercentage,
      },
    });

    return {
      message: 'Project update amended successfully',
      update: {
        id: updated.id,
        projectId: updated.projectId,
        title: updated.title,
        description: updated.description,
        progressPercentage: Number(updated.progressPercentage),
        createdAt: updated.createdAt,
        author: updated.createdBy,
        milestone: updated.milestone
          ? {
              ...updated.milestone,
              percentage: Number(updated.milestone.percentage),
            }
          : null,
        media: updated.media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          storageKey: m.storageKey,
        })),
      },
    };
  }

  /**
   * Delete a progress update and its associated media records.
   */
  async deleteProjectUpdate(
    updateId: string,
    deleterId: string,
    userRoles: string[],
  ) {
    const existing = await this.prisma.projectUpdate.findUnique({
      where: { id: updateId },
    });

    if (!existing) {
      throw new NotFoundException(`Project update with ID '${updateId}' not found`);
    }

    const isAdmin = userRoles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAdmin && existing.createdById !== deleterId) {
      throw new ForbiddenException(
        'Only an administrator or the author can delete this project update',
      );
    }

    await this.prisma.projectUpdate.delete({
      where: { id: updateId },
    });

    await this.auditService.log({
      userId: deleterId,
      action: 'CONSTRUCTION_UPDATE_DELETED',
      entityType: 'ProjectUpdate',
      entityId: updateId,
      oldValues: {
        projectId: existing.projectId,
        title: existing.title,
        progressPercentage: existing.progressPercentage,
      },
    });

    return {
      message: `Project update '${existing.title}' deleted successfully`,
      id: updateId,
      projectId: existing.projectId,
    };
  }


  // ==========================================
  // FEATURE 4: PROJECT FINANCIALS & EXPENSES
  // ==========================================

  /**
   * Record a new project expenditure in the financial ledger.
   */
  async recordExpense(
    projectId: string,
    dto: CreateProjectExpenseDto,
    recorderId: string,
  ) {
    const project = await this.prisma.constructionProject.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, budget: true, projectCode: true, projectManagerId: true },
    });

    if (!project) {
      throw new NotFoundException(`Construction project with ID '${projectId}' not found`);
    }

    const expense = await this.prisma.projectExpense.create({
      data: {
        projectId,
        category: dto.category.trim().toUpperCase(),
        description: dto.description.trim(),
        amount: dto.amount,
        currency: dto.currency ? dto.currency.toUpperCase() : 'NGN',
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        recordedById: recorderId,
      },
      include: {
        recordedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Check financial health & budget utilization
    const agg = await this.prisma.projectExpense.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });
    const totalExpenses = Number(agg._sum.amount || 0);
    const budget = Number(project.budget);
    const isOverBudget = totalExpenses > budget;
    const utilizationPercentage = budget > 0 ? (totalExpenses / budget) * 100 : 0;

    await this.auditService.log({
      userId: recorderId,
      action: 'CONSTRUCTION_EXPENSE_RECORDED',
      entityType: 'ProjectExpense',
      entityId: expense.id,
      newValues: {
        projectId,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        cumulativeExpenses: totalExpenses,
        budget,
        isOverBudget,
      },
    });

    return {
      message: 'Project expense recorded successfully',
      expense: {
        id: expense.id,
        projectId: expense.projectId,
        category: expense.category,
        description: expense.description,
        amount: Number(expense.amount),
        currency: expense.currency,
        expenseDate: expense.expenseDate,
        recordedBy: expense.recordedBy,
      },
      financialSnapshot: {
        budget,
        totalExpenses,
        remainingBudget: budget - totalExpenses,
        utilizationPercentage: Number(utilizationPercentage.toFixed(2)),
        isOverBudget,
      },
    };
  }

  /**
   * Retrieve paginated ledger of expenses for a construction project with filters.
   */
  async getProjectExpenses(projectId: string, query: ProjectExpenseQueryDto) {
    const project = await this.prisma.constructionProject.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, projectCode: true, budget: true },
    });

    if (!project) {
      throw new NotFoundException(`Construction project with ID '${projectId}' not found`);
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectExpenseWhereInput = {
      projectId,
    };

    if (query.category) {
      where.category = {
        contains: query.category.trim(),
        mode: 'insensitive',
      };
    }

    if (query.startDate || query.endDate) {
      where.expenseDate = {};
      if (query.startDate) where.expenseDate.gte = new Date(query.startDate);
      if (query.endDate) where.expenseDate.lte = new Date(query.endDate);
    }

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      where.amount = {};
      if (query.minAmount !== undefined) where.amount.gte = query.minAmount;
      if (query.maxAmount !== undefined) where.amount.lte = query.maxAmount;
    }

    const [expenses, total, sumFiltered, aggProject] = await Promise.all([
      this.prisma.projectExpense.findMany({
        where,
        include: {
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.projectExpense.count({ where }),
      this.prisma.projectExpense.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.projectExpense.aggregate({
        where: { projectId },
        _sum: { amount: true },
      }),
    ]);

    const totalProjectExpenses = Number(aggProject._sum.amount || 0);
    const budget = Number(project.budget);

    return {
      project: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        budget,
      },
      expenses: expenses.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        currency: e.currency,
        expenseDate: e.expenseDate,
        recordedBy: e.recordedBy,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
        filteredSum: Number(sumFiltered._sum.amount || 0),
        totalProjectExpenses,
        remainingBudget: budget - totalProjectExpenses,
      },
    };
  }

  /**
   * Retrieve holistic financial health summary and category breakdown for a project.
   */
  async getProjectFinancialSummary(projectId: string) {
    const project = await this.prisma.constructionProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        projectCode: true,
        name: true,
        status: true,
        budget: true,
        startDate: true,
        expectedEndDate: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Construction project with ID '${projectId}' not found`);
    }

    const [aggTotal, categoryGroups, recentExpenses] = await Promise.all([
      this.prisma.projectExpense.aggregate({
        where: { projectId },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.projectExpense.groupBy({
        by: ['category'],
        where: { projectId },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.projectExpense.findMany({
        where: { projectId },
        orderBy: { expenseDate: 'desc' },
        take: 5,
        include: {
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const budget = Number(project.budget);
    const totalExpenses = Number(aggTotal._sum.amount || 0);
    const remainingBudget = budget - totalExpenses;
    const utilizationPercentage = budget > 0 ? (totalExpenses / budget) * 100 : 0;
    const isOverBudget = totalExpenses > budget;

    const categoryBreakdown = categoryGroups.map((cg) => {
      const sum = Number(cg._sum.amount || 0);
      return {
        category: cg.category,
        totalAmount: sum,
        expenseCount: cg._count.id,
        percentageOfTotalSpend:
          totalExpenses > 0 ? Number(((sum / totalExpenses) * 100).toFixed(2)) : 0,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      project: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        status: project.status,
        budget,
        startDate: project.startDate,
        expectedEndDate: project.expectedEndDate,
      },
      financialSummary: {
        budget,
        totalExpenses,
        remainingBudget,
        utilizationPercentage: Number(utilizationPercentage.toFixed(2)),
        isOverBudget,
        totalTransactionsCount: aggTotal._count.id,
      },
      categoryBreakdown,
      recentExpenses: recentExpenses.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        currency: e.currency,
        expenseDate: e.expenseDate,
        recordedBy: e.recordedBy,
      })),
    };
  }

  /**
   * Get single expense details by UUID.
   */
  async getExpenseById(id: string) {
    const expense = await this.prisma.projectExpense.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            budget: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense record with ID '${id}' not found`);
    }

    return {
      id: expense.id,
      project: {
        ...expense.project,
        budget: Number(expense.project.budget),
      },
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount),
      currency: expense.currency,
      expenseDate: expense.expenseDate,
      recordedBy: expense.recordedBy,
    };
  }

  /**
   * Update an existing expense record.
   */
  async updateExpense(
    id: string,
    dto: UpdateProjectExpenseDto,
    editorId: string,
    userRoles: string[],
  ) {
    const existing = await this.prisma.projectExpense.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Expense record with ID '${id}' not found`);
    }

    const isAdminOrFinance = userRoles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER'].includes(r.toUpperCase()),
    );
    if (!isAdminOrFinance && existing.recordedById !== editorId) {
      throw new ForbiddenException(
        'Only an administrator, finance officer, or the original recorder can update this expense',
      );
    }

    const updated = await this.prisma.projectExpense.update({
      where: { id },
      data: {
        category: dto.category !== undefined ? dto.category.trim().toUpperCase() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        amount: dto.amount !== undefined ? dto.amount : undefined,
        currency: dto.currency !== undefined ? dto.currency.toUpperCase() : undefined,
        expenseDate: dto.expenseDate !== undefined ? new Date(dto.expenseDate) : undefined,
      },
      include: {
        recordedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: editorId,
      action: 'CONSTRUCTION_EXPENSE_UPDATED',
      entityType: 'ProjectExpense',
      entityId: id,
      oldValues: {
        amount: existing.amount,
        category: existing.category,
      },
      newValues: {
        amount: updated.amount,
        category: updated.category,
      },
    });

    return {
      message: 'Expense record updated successfully',
      expense: {
        id: updated.id,
        projectId: updated.projectId,
        category: updated.category,
        description: updated.description,
        amount: Number(updated.amount),
        currency: updated.currency,
        expenseDate: updated.expenseDate,
        recordedBy: updated.recordedBy,
      },
    };
  }

  /**
   * Delete an expense record.
   */
  async deleteExpense(
    id: string,
    deleterId: string,
    userRoles: string[],
  ) {
    const existing = await this.prisma.projectExpense.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Expense record with ID '${id}' not found`);
    }

    const isAdminOrFinance = userRoles.some((r) =>
      ['ADMIN', 'SUPER_ADMIN', 'FINANCE_OFFICER'].includes(r.toUpperCase()),
    );
    if (!isAdminOrFinance && existing.recordedById !== deleterId) {
      throw new ForbiddenException(
        'Only an administrator, finance officer, or the author can delete this expense',
      );
    }

    await this.prisma.projectExpense.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: deleterId,
      action: 'CONSTRUCTION_EXPENSE_DELETED',
      entityType: 'ProjectExpense',
      entityId: id,
      oldValues: {
        projectId: existing.projectId,
        amount: existing.amount,
        category: existing.category,
      },
    });

    return {
      message: 'Expense record deleted successfully',
      id,
      projectId: existing.projectId,
    };
  }

}
