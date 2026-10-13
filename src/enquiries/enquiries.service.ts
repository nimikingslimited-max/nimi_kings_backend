import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateEnquiryDto } from './dto/create-enquiry.dto.js';
import { AssignEnquiryAgentDto } from './dto/assign-enquiry-agent.dto.js';
import { UpdateEnquiryStatusDto } from './dto/update-enquiry-status.dto.js';
import { EnquiryQueryDto } from './dto/enquiry-query.dto.js';

@Injectable()
export class EnquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateEnquiryDto, customerId: string) {
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
            userRoles: {
              include: { role: true },
            },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${dto.propertyId}' not found`);
    }

    // Automatic Lead Routing: Check active PropertyAgent first, then check if creator is an AGENT
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

    const initialStatus = autoAgentId ? 'ASSIGNED' : 'NEW';

    const enquiry = await this.prisma.propertyEnquiry.create({
      data: {
        propertyId: property.id,
        customerId,
        agentId: autoAgentId,
        type: dto.type ?? 'GENERAL_ENQUIRY',
        message: dto.message,
        status: initialStatus,
      },
      include: {
        property: {
          select: {
            id: true,
            propertyCode: true,
            title: true,
            propertyType: true,
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

    // If auto-assigned to an agent, ensure CustomerAgent relationship is tracked
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
      action: 'PROPERTY_ENQUIRY_CREATED',
      entityType: 'PropertyEnquiry',
      entityId: enquiry.id,
      newValues: {
        propertyCode: property.propertyCode,
        type: enquiry.type,
        status: enquiry.status,
        agentId: autoAgentId,
      },
    });

    return enquiry;
  }

  async findMyEnquiries(customerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, enquiries] = await Promise.all([
      this.prisma.propertyEnquiry.count({ where: { customerId } }),
      this.prisma.propertyEnquiry.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      data: enquiries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(query: EnquiryQueryDto, currentUser: any) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyEnquiryWhereInput = {};

    const isAdminOrManager = currentUser.roles?.some((r: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'].includes(r),
    );

    // If user is strictly an AGENT (not Admin/Manager), restrict to enquiries assigned to them
    if (!isAdminOrManager && currentUser.roles?.includes('AGENT')) {
      where.agentId = currentUser.id;
    } else if (query.agentId) {
      where.agentId = query.agentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.propertyId) {
      where.property = {
        OR: [{ id: query.propertyId }, { propertyCode: query.propertyId }],
      };
    }

    if (query.search) {
      where.OR = [
        { message: { contains: query.search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
        {
          property: {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { propertyCode: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, enquiries] = await Promise.all([
      this.prisma.propertyEnquiry.count({ where }),
      this.prisma.propertyEnquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              propertyType: true,
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
      data: enquiries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: any) {
    const enquiry = await this.prisma.propertyEnquiry.findUnique({
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

    if (!enquiry) {
      throw new NotFoundException(`Enquiry '${id}' not found`);
    }

    const isAdminOrManager = currentUser.roles?.some((r: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'].includes(r),
    );

    if (
      !isAdminOrManager &&
      enquiry.customerId !== currentUser.id &&
      enquiry.agentId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this enquiry',
      );
    }

    return enquiry;
  }

  async assignAgent(
    id: string,
    dto: AssignEnquiryAgentDto,
    assignerId: string,
  ) {
    const enquiry = await this.prisma.propertyEnquiry.findUnique({
      where: { id },
    });

    if (!enquiry) {
      throw new NotFoundException(`Enquiry '${id}' not found`);
    }

    const agent = await this.prisma.user.findUnique({
      where: { id: dto.agentId },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!agent || agent.status !== 'ACTIVE') {
      throw new BadRequestException('Assigned agent must be an active user');
    }

    const oldAgentId = enquiry.agentId;
    const oldStatus = enquiry.status;
    const newStatus =
      enquiry.status === 'NEW' ? 'ASSIGNED' : enquiry.status;

    const updated = await this.prisma.propertyEnquiry.update({
      where: { id },
      data: {
        agentId: agent.id,
        status: newStatus,
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

    // Record CustomerAgent & PropertyAgent links
    await Promise.all([
      this.prisma.customerAgent.upsert({
        where: {
          customerId_agentId: {
            customerId: enquiry.customerId,
            agentId: agent.id,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          customerId: enquiry.customerId,
          agentId: agent.id,
          status: 'ACTIVE',
        },
      }),
      this.prisma.propertyAgent.upsert({
        where: {
          propertyId_agentId: {
            propertyId: enquiry.propertyId,
            agentId: agent.id,
          },
        },
        update: { status: 'ACTIVE', assignedBy: assignerId },
        create: {
          propertyId: enquiry.propertyId,
          agentId: agent.id,
          assignedBy: assignerId,
          status: 'ACTIVE',
        },
      }),
    ]);

    await this.auditService.log({
      userId: assignerId,
      action: 'ENQUIRY_AGENT_ASSIGNED',
      entityType: 'PropertyEnquiry',
      entityId: enquiry.id,
      oldValues: { agentId: oldAgentId, status: oldStatus },
      newValues: { agentId: agent.id, status: newStatus },
    });

    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateEnquiryStatusDto,
    currentUser: any,
  ) {
    const enquiry = await this.prisma.propertyEnquiry.findUnique({
      where: { id },
    });

    if (!enquiry) {
      throw new NotFoundException(`Enquiry '${id}' not found`);
    }

    const isAdminOrManager = currentUser.roles?.some((r: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'].includes(r),
    );

    if (!isAdminOrManager && enquiry.agentId !== currentUser.id) {
      throw new ForbiddenException(
        'Only the assigned agent or an administrator can update this enquiry status',
      );
    }

    const oldStatus = enquiry.status;

    const updated = await this.prisma.propertyEnquiry.update({
      where: { id },
      data: { status: dto.status },
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
          },
        },
        agent: {
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
      userId: currentUser.id,
      action: `ENQUIRY_STATUS_${dto.status}`,
      entityType: 'PropertyEnquiry',
      entityId: enquiry.id,
      oldValues: { status: oldStatus },
      newValues: { status: dto.status },
    });

    return updated;
  }
}
