import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateConstructionProjectDto } from './dto/create-construction-project.dto.js';
import { UpdateConstructionProjectDto } from './dto/update-construction-project.dto.js';
import { ConstructionProjectQueryDto } from './dto/construction-project-query.dto.js';

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
}
