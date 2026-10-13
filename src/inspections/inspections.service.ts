import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateInspectionDto } from './dto/create-inspection.dto.js';
import { UpdateInspectionDto } from './dto/update-inspection.dto.js';
import { AssignPropertyAgentDto } from './dto/assign-property-agent.dto.js';
import { InspectionQueryDto } from './dto/inspection-query.dto.js';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateInspectionDto, customerId: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        OR: [{ id: dto.propertyId }, { propertyCode: dto.propertyId }],
        deletedAt: null,
      },
      include: {
        assignedAgents: {
          where: { status: 'ACTIVE' },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
        createdBy: {
          include: {
            userRoles: { include: { role: true } },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${dto.propertyId}' not found`);
    }

    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduledAt date format');
    }

    // Auto-route to active PropertyAgent or creator if AGENT
    let autoAgentId: string | null =
      property.assignedAgents[0]?.agentId ?? null;

    if (!autoAgentId && property.createdBy) {
      const isCreatorAgent = property.createdBy.userRoles.some(
        (ur) => ur.role.name === 'AGENT',
      );
      if (isCreatorAgent && property.createdBy.status === 'ACTIVE') {
        autoAgentId = property.createdBy.id;
      }
    }

    const inspection = await this.prisma.propertyInspection.create({
      data: {
        propertyId: property.id,
        customerId,
        agentId: autoAgentId,
        scheduledAt: scheduledDate,
        status: 'REQUESTED',
        location: dto.location ?? `${property.address}, ${property.city}`,
        notes: dto.notes,
      },
      include: {
        property: {
          select: {
            id: true,
            propertyCode: true,
            title: true,
            propertyType: true,
            address: true,
            city: true,
            state: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        agent: {
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

    if (autoAgentId && autoAgentId !== customerId) {
      await this.prisma.customerAgent.upsert({
        where: {
          customerId_agentId: {
            customerId,
            agentId: autoAgentId,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          customerId,
          agentId: autoAgentId,
          status: 'ACTIVE',
        },
      });
    }

    await this.auditService.log({
      userId: customerId,
      action: 'PROPERTY_INSPECTION_REQUESTED',
      entityType: 'PropertyInspection',
      entityId: inspection.id,
      newValues: {
        propertyCode: property.propertyCode,
        scheduledAt: inspection.scheduledAt,
        agentId: autoAgentId,
      },
    });

    return inspection;
  }

  async findMyInspections(customerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, inspections] = await Promise.all([
      this.prisma.propertyInspection.count({ where: { customerId } }),
      this.prisma.propertyInspection.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              propertyType: true,
              address: true,
              city: true,
              state: true,
              latitude: true,
              longitude: true,
              media: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    return {
      data: inspections,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(query: InspectionQueryDto, currentUser: any) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyInspectionWhereInput = {};

    const isAdminOrManager = currentUser.roles?.some((r: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'].includes(r),
    );

    if (!isAdminOrManager && currentUser.roles?.includes('AGENT')) {
      where.agentId = currentUser.id;
    } else if (query.agentId) {
      where.agentId = query.agentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.propertyId) {
      where.property = {
        OR: [{ id: query.propertyId }, { propertyCode: query.propertyId }],
      };
    }

    if (query.fromDate || query.toDate) {
      where.scheduledAt = {
        ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
        ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
      };
    }

    const [total, inspections] = await Promise.all([
      this.prisma.propertyInspection.count({ where }),
      this.prisma.propertyInspection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              propertyType: true,
              address: true,
              city: true,
              state: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    return {
      data: inspections,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: any) {
    const inspection = await this.prisma.propertyInspection.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            propertyCode: true,
            title: true,
            propertyType: true,
            address: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        agent: {
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

    if (!inspection) {
      throw new NotFoundException(`Inspection '${id}' not found`);
    }

    const isAdminOrManager = currentUser.roles?.some((r: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'].includes(r),
    );

    if (
      !isAdminOrManager &&
      inspection.customerId !== currentUser.id &&
      inspection.agentId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this inspection',
      );
    }

    return inspection;
  }

  async update(
    id: string,
    dto: UpdateInspectionDto,
    currentUser: any,
  ) {
    const inspection = await this.prisma.propertyInspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection '${id}' not found`);
    }

    const isAdminOrManager = currentUser.roles?.some((r: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'].includes(r),
    );

    if (!isAdminOrManager && inspection.agentId !== currentUser.id) {
      throw new ForbiddenException(
        'Only the assigned agent or an administrator can update this inspection',
      );
    }

    if (dto.agentId) {
      const agent = await this.prisma.user.findUnique({
        where: { id: dto.agentId },
      });
      if (!agent || agent.status !== 'ACTIVE') {
        throw new BadRequestException('Assigned agent must be an active user');
      }

      await this.prisma.customerAgent.upsert({
        where: {
          customerId_agentId: {
            customerId: inspection.customerId,
            agentId: dto.agentId,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          customerId: inspection.customerId,
          agentId: dto.agentId,
          status: 'ACTIVE',
        },
      });
    }

    const oldValues = {
      status: inspection.status,
      scheduledAt: inspection.scheduledAt,
      agentId: inspection.agentId,
    };

    const updated = await this.prisma.propertyInspection.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: new Date(dto.scheduledAt) }
          : {}),
        ...(dto.agentId !== undefined ? { agentId: dto.agentId } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.status === 'COMPLETED' && !inspection.completedAt
          ? { completedAt: new Date() }
          : {}),
      },
      include: {
        property: {
          select: {
            id: true,
            propertyCode: true,
            title: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        agent: {
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
      userId: currentUser.id,
      action: `INSPECTION_UPDATED_${updated.status}`,
      entityType: 'PropertyInspection',
      entityId: inspection.id,
      oldValues,
      newValues: {
        status: updated.status,
        scheduledAt: updated.scheduledAt,
        agentId: updated.agentId,
      },
    });

    return updated;
  }

  async cancelByCustomer(id: string, customerId: string) {
    const inspection = await this.prisma.propertyInspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection '${id}' not found`);
    }

    if (inspection.customerId !== customerId) {
      throw new ForbiddenException(
        'You can only cancel your own inspection requests',
      );
    }

    if (inspection.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot cancel an inspection that has already been completed',
      );
    }

    const oldStatus = inspection.status;

    const updated = await this.prisma.propertyInspection.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.auditService.log({
      userId: customerId,
      action: 'INSPECTION_CANCELLED_BY_CUSTOMER',
      entityType: 'PropertyInspection',
      entityId: inspection.id,
      oldValues: { status: oldStatus },
      newValues: { status: 'CANCELLED' },
    });

    return updated;
  }

  async assignAgentToProperty(
    dto: AssignPropertyAgentDto,
    assignerId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: {
        OR: [{ id: dto.propertyId }, { propertyCode: dto.propertyId }],
        deletedAt: null,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${dto.propertyId}' not found`);
    }

    const agent = await this.prisma.user.findUnique({
      where: { id: dto.agentId },
      include: {
        agentProfile: true,
      },
    });

    if (!agent || agent.status !== 'ACTIVE') {
      throw new BadRequestException('Assigned agent must be an active user');
    }

    const assignment = await this.prisma.propertyAgent.upsert({
      where: {
        propertyId_agentId: {
          propertyId: property.id,
          agentId: agent.id,
        },
      },
      update: {
        status: 'ACTIVE',
        assignedBy: assignerId,
        assignedAt: new Date(),
      },
      create: {
        propertyId: property.id,
        agentId: agent.id,
        assignedBy: assignerId,
        status: 'ACTIVE',
      },
    });

    await this.auditService.log({
      userId: assignerId,
      action: 'PROPERTY_AGENT_ASSIGNED',
      entityType: 'Property',
      entityId: property.id,
      newValues: {
        propertyCode: property.propertyCode,
        agentId: agent.id,
        agentEmail: agent.email,
      },
    });

    return {
      assignment,
      property: {
        id: property.id,
        propertyCode: property.propertyCode,
        title: property.title,
      },
      agent: {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone,
        agentProfile: agent.agentProfile,
      },
    };
  }

  async getPropertyAgents(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        OR: [{ id: propertyId }, { propertyCode: propertyId }],
        deletedAt: null,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${propertyId}' not found`);
    }

    const assignments = await this.prisma.propertyAgent.findMany({
      where: { propertyId: property.id, status: 'ACTIVE' },
      orderBy: { assignedAt: 'desc' },
    });

    const agentIds = assignments.map((a) => a.agentId);
    const agents = await this.prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        agentProfile: true,
      },
    });

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    return {
      property: {
        id: property.id,
        propertyCode: property.propertyCode,
        title: property.title,
      },
      assignedAgents: assignments.map((a) => ({
        assignmentId: a.id,
        assignedAt: a.assignedAt,
        status: a.status,
        agent: agentMap.get(a.agentId) ?? null,
      })),
    };
  }

  async removeAgentFromProperty(
    propertyId: string,
    agentId: string,
    removerId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: {
        OR: [{ id: propertyId }, { propertyCode: propertyId }],
        deletedAt: null,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${propertyId}' not found`);
    }

    const existing = await this.prisma.propertyAgent.findUnique({
      where: {
        propertyId_agentId: {
          propertyId: property.id,
          agentId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        'Agent is not assigned to this property',
      );
    }

    await this.prisma.propertyAgent.update({
      where: { id: existing.id },
      data: { status: 'INACTIVE' },
    });

    await this.auditService.log({
      userId: removerId,
      action: 'PROPERTY_AGENT_REMOVED',
      entityType: 'Property',
      entityId: property.id,
      oldValues: { agentId, status: 'ACTIVE' },
      newValues: { agentId, status: 'INACTIVE' },
    });

    return { message: 'Agent unassigned from property successfully' };
  }
}
