import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto.js';
import { CreateStaffUserDto } from './dto/create-staff-user.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get overarching Platform Dashboard Overview with real-time operational KPIs across all domains.
   */
  async getDashboardOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. User & Identity Metrics
    const [
      totalUsers,
      usersByStatusRaw,
      allRoles,
      userRolesGroup,
      newUsersWeek,
      newUsersMonth,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.role.findMany({ select: { id: true, name: true } }),
      this.prisma.userRole.groupBy({
        by: ['roleId'],
        _count: { userId: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
      }),
    ]);

    const roleNameMap = new Map(allRoles.map((r) => [r.id, r.name]));
    const usersByRole: Record<string, number> = {};
    for (const r of userRolesGroup) {
      const name = roleNameMap.get(r.roleId) || r.roleId;
      usersByRole[name] = r._count.userId;
    }

    const usersByStatus: Record<string, number> = {};
    for (const s of usersByStatusRaw) {
      usersByStatus[s.status] = s._count.id;
    }

    // 2. Property Catalog Metrics
    const [
      totalProperties,
      propertiesByTypeRaw,
      listingsByStatusRaw,
      listingsByTypeRaw,
    ] = await Promise.all([
      this.prisma.property.count({ where: { deletedAt: null } }),
      this.prisma.property.groupBy({
        by: ['propertyType'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.propertyListing.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.propertyListing.groupBy({
        by: ['listingType'],
        _count: { id: true },
      }),
    ]);

    const propertiesByType: Record<string, number> = {};
    for (const p of propertiesByTypeRaw) {
      propertiesByType[p.propertyType] = p._count.id;
    }

    const listingsByStatus: Record<string, number> = {};
    for (const l of listingsByStatusRaw) {
      listingsByStatus[l.status] = l._count.id;
    }

    const listingsByType: Record<string, number> = {};
    for (const l of listingsByTypeRaw) {
      listingsByType[l.listingType] = l._count.id;
    }

    // 3. Property Verification Intelligence Metrics
    const [
      totalVerifications,
      verificationsByStatusRaw,
      verificationsByRiskRaw,
      pendingVerificationsCount,
      flaggedHighRiskCount,
    ] = await Promise.all([
      this.prisma.propertyVerification.count(),
      this.prisma.propertyVerification.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.propertyVerification.groupBy({
        by: ['riskLevel'],
        _count: { id: true },
      }),
      this.prisma.propertyVerification.count({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.prisma.propertyVerification.count({
        where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } },
      }),
    ]);

    const verificationsByStatus: Record<string, number> = {};
    for (const v of verificationsByStatusRaw) {
      verificationsByStatus[v.status] = v._count.id;
    }

    const verificationsByRisk: Record<string, number> = {};
    for (const v of verificationsByRiskRaw) {
      verificationsByRisk[v.riskLevel] = v._count.id;
    }

    // 4. Field Inspections & Operations
    const [
      totalInspections,
      inspectionsByStatusRaw,
      unassignedInspectionsCount,
      todayInspectionsCount,
      ratingAggregate,
    ] = await Promise.all([
      this.prisma.propertyInspection.count(),
      this.prisma.propertyInspection.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.propertyInspection.count({
        where: { agentId: null, status: { not: 'CANCELLED' } },
      }),
      this.prisma.propertyInspection.count({
        where: {
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: { in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED'] },
        },
      }),
      this.prisma.propertyInspection.aggregate({
        where: { customerRating: { not: null } },
        _avg: { customerRating: true },
        _count: { customerRating: true },
      }),
    ]);

    const inspectionsByStatus: Record<string, number> = {};
    for (const i of inspectionsByStatusRaw) {
      inspectionsByStatus[i.status] = i._count.id;
    }

    const averageCustomerRating = ratingAggregate._avg.customerRating
      ? Number(ratingAggregate._avg.customerRating.toFixed(1))
      : null;

    // 5. CRM Enquiries & Customer Leads
    const [totalEnquiries, enquiriesByStatusRaw, unassignedEnquiriesCount] =
      await Promise.all([
        this.prisma.propertyEnquiry.count(),
        this.prisma.propertyEnquiry.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.propertyEnquiry.count({
          where: { agentId: null },
        }),
      ]);

    const enquiriesByStatus: Record<string, number> = {};
    for (const e of enquiriesByStatusRaw) {
      enquiriesByStatus[e.status] = e._count.id;
    }

    // 6. Customer Identity & KYC Compliance Pipeline
    const [totalKycProfiles, kycByStatusRaw, pendingKycCount] =
      await Promise.all([
        this.prisma.customerProfile.count(),
        this.prisma.customerProfile.groupBy({
          by: ['kycStatus'],
          _count: { id: true },
        }),
        this.prisma.customerProfile.count({
          where: { kycStatus: 'PENDING' },
        }),
      ]);

    const kycByStatus: Record<string, number> = {};
    for (const k of kycByStatusRaw) {
      kycByStatus[k.kycStatus] = k._count.id;
    }

    // 7. Transactions & Commercial Volume
    const [totalTransactions, transactionsByStatusRaw, successfulVolumeRaw] =
      await Promise.all([
        this.prisma.transaction.count(),
        this.prisma.transaction.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.transaction.aggregate({
          where: { status: 'SUCCESSFUL' },
          _sum: { amount: true },
        }),
      ]);

    const transactionsByStatus: Record<string, number> = {};
    for (const t of transactionsByStatusRaw) {
      transactionsByStatus[t.status] = t._count.id;
    }

    const totalSuccessfulVolume = successfulVolumeRaw._sum.amount
      ? Number(successfulVolumeRaw._sum.amount)
      : 0;

    // 8. Action Feeds & Critical Attention Queues
    const [
      recentAuditLogs,
      pendingKycList,
      unassignedVisitsList,
      flaggedVerificationsList,
    ] = await Promise.all([
      this.prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.customerProfile.findMany({
        where: { kycStatus: 'PENDING' },
        take: 4,
        orderBy: { kycSubmittedAt: 'desc' },
        include: {
          user: {
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
      this.prisma.propertyInspection.findMany({
        where: { agentId: null, status: 'REQUESTED' },
        take: 4,
        orderBy: { scheduledAt: 'asc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              address: true,
              city: true,
            },
          },
        },
      }),
      this.prisma.propertyVerification.findMany({
        where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } },
        take: 4,
        orderBy: { updatedAt: 'desc' },
        include: {
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              propertyType: true,
            },
          },
        },
      }),
    ]);

    return {
      timestamp: now,
      summary: {
        totalUsers,
        totalProperties,
        totalVerifications,
        totalInspections,
        totalEnquiries,
        totalTransactions,
        totalRevenue: totalSuccessfulVolume,
        currency: 'NGN',
      },
      users: {
        total: totalUsers,
        byStatus: usersByStatus,
        byRole: usersByRole,
        newThisWeek: newUsersWeek,
        newThisMonth: newUsersMonth,
      },
      properties: {
        total: totalProperties,
        byType: propertiesByType,
        byListingStatus: listingsByStatus,
        byListingType: listingsByType,
      },
      verifications: {
        total: totalVerifications,
        pendingReviewCount: pendingVerificationsCount,
        flaggedHighRiskCount,
        byStatus: verificationsByStatus,
        byRiskLevel: verificationsByRisk,
      },
      inspections: {
        total: totalInspections,
        unassignedCount: unassignedInspectionsCount,
        todayCount: todayInspectionsCount,
        averageCustomerRating,
        totalReviews: ratingAggregate._count.customerRating,
        byStatus: inspectionsByStatus,
      },
      enquiries: {
        total: totalEnquiries,
        unassignedCount: unassignedEnquiriesCount,
        byStatus: enquiriesByStatus,
      },
      kyc: {
        totalProfiles: totalKycProfiles,
        pendingReviewCount: pendingKycCount,
        byStatus: kycByStatus,
      },
      transactions: {
        total: totalTransactions,
        successfulVolume: totalSuccessfulVolume,
        currency: 'NGN',
        byStatus: transactionsByStatus,
      },
      urgentActionItems: {
        pendingKyc: {
          count: pendingKycCount,
          items: pendingKycList.map((k) => ({
            customerId: k.userId,
            fullName: `${k.user.firstName} ${k.user.lastName}`,
            email: k.user.email,
            phone: k.user.phone,
            idType: k.idType,
            submittedAt: k.kycSubmittedAt,
          })),
        },
        unassignedInspections: {
          count: unassignedInspectionsCount,
          items: unassignedVisitsList.map((v) => ({
            id: v.id,
            propertyTitle: v.property.title,
            propertyCode: v.property.propertyCode,
            customerName: `${v.customer.firstName} ${v.customer.lastName}`,
            scheduledAt: v.scheduledAt,
          })),
        },
        highRiskVerifications: {
          count: flaggedHighRiskCount,
          items: flaggedVerificationsList.map((fv) => ({
            id: fv.id,
            propertyTitle: fv.property.title,
            propertyCode: fv.property.propertyCode,
            riskLevel: fv.riskLevel,
            status: fv.status,
            verificationCode: fv.verificationCode,
          })),
        },
      },
      recentAuditLogs: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.user
          ? {
              id: log.user.id,
              name: `${log.user.firstName} ${log.user.lastName}`,
              email: log.user.email,
            }
          : { name: 'System / Automated' },
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Paginated user directory with search, role, status, email verification, and KYC filters.
   */
  async getUsers(query: AdminUserQueryDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(Number(query.limit), 100) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.role) {
      where.userRoles = {
        some: {
          role: {
            name: query.role,
          },
        },
      };
    }

    if (query.emailVerified === true) {
      where.emailVerifiedAt = { not: null };
    } else if (query.emailVerified === false) {
      where.emailVerifiedAt = null;
    }

    if (query.kycStatus) {
      where.customerProfile = {
        kycStatus: query.kycStatus,
      };
    }

    const validSortFields = ['createdAt', 'lastLoginAt', 'firstName', 'lastName', 'status'];
    const sortBy = validSortFields.includes(query.sortBy || '') ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy!]: sortOrder },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
          customerProfile: {
            select: {
              kycStatus: true,
              city: true,
              state: true,
              country: true,
            },
          },
          agentProfile: {
            select: {
              agentCode: true,
              agencyName: true,
              licenseNumber: true,
            },
          },
        },
      }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      emailVerified: !!u.emailVerifiedAt,
      emailVerifiedAt: u.emailVerifiedAt,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      roles: u.userRoles.map((ur) => ur.role.name),
      kycStatus: u.customerProfile?.kycStatus || 'NOT_SUBMITTED',
      customerProfile: u.customerProfile,
      agentProfile: u.agentProfile,
    }));

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
   * Get 360-degree deep dossier for any user in the system.
   */
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        customerProfile: true,
        agentProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const isCustomer = roles.includes('CUSTOMER');
    const isAgent = roles.includes('AGENT');

    // Contextual metrics
    const [savedCount, inspectionsAsCustomer, enquiriesAsCustomer, transactionsAsCustomer, assignedProperties, leadsAsAgent, completedVisitsAsAgent, recentAuditLogs] =
      await Promise.all([
        isCustomer ? this.prisma.savedProperty.count({ where: { userId: id } }) : 0,
        isCustomer ? this.prisma.propertyInspection.count({ where: { customerId: id } }) : 0,
        isCustomer ? this.prisma.propertyEnquiry.count({ where: { customerId: id } }) : 0,
        isCustomer ? this.prisma.transaction.count({ where: { customerId: id } }) : 0,
        isAgent ? this.prisma.propertyAgent.count({ where: { agentId: id, status: 'ACTIVE' } }) : 0,
        isAgent ? this.prisma.propertyEnquiry.count({ where: { agentId: id } }) : 0,
        isAgent ? this.prisma.propertyInspection.count({ where: { agentId: id, status: 'COMPLETED' } }) : 0,
        this.prisma.auditLog.findMany({
          where: {
            OR: [{ userId: id }, { entityId: id }],
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: user.status,
        emailVerified: !!user.emailVerifiedAt,
        emailVerifiedAt: user.emailVerifiedAt,
        phoneVerifiedAt: user.phoneVerifiedAt,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles,
      },
      customerProfile: user.customerProfile,
      agentProfile: user.agentProfile,
      contextualMetrics: {
        asCustomer: isCustomer
          ? {
              savedPropertiesCount: savedCount,
              inspectionsCount: inspectionsAsCustomer,
              enquiriesCount: enquiriesAsCustomer,
              transactionsCount: transactionsAsCustomer,
            }
          : null,
        asAgent: isAgent
          ? {
              activeAssignedProperties: assignedProperties,
              assignedLeads: leadsAsAgent,
              completedInspections: completedVisitsAsAgent,
            }
          : null,
      },
      recentAuditLogs,
    };
  }

  /**
   * Suspend, activate, or deactivate a user account with session revocation on suspension.
   */
  async updateUserStatus(id: string, dto: UpdateUserStatusDto, adminId: string) {
    if (id === adminId && (dto.status === 'SUSPENDED' || dto.status === 'DEACTIVATED')) {
      throw new BadRequestException('You cannot suspend or deactivate your own administrator account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    const oldStatus = user.status;

    // If suspending or deactivating, terminate active sessions
    if (dto.status === 'SUSPENDED' || dto.status === 'DEACTIVATED') {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        deletedAt: dto.status === 'DEACTIVATED' ? new Date() : null,
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: `ADMIN_USER_STATUS_${dto.status}`,
      entityType: 'User',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status: dto.status, reason: dto.reason },
    });

    return {
      message: `User status updated to ${dto.status} successfully`,
      user: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        status: updated.status,
        roles: updated.userRoles.map((ur) => ur.role.name),
        updatedAt: updated.updatedAt,
      },
    };
  }

  /**
   * Reassign system roles (RBAC) to a user.
   */
  async updateUserRoles(id: string, dto: UpdateUserRolesDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    const oldRoles = user.userRoles.map((ur) => ur.role.name);

    if (id === adminId && !dto.roles.includes('ADMIN' as any) && !dto.roles.includes('SUPER_ADMIN' as any)) {
      throw new BadRequestException('You cannot revoke your own administrator privileges');
    }

    // Match all roles in database
    const matchedRoles = await this.prisma.role.findMany({
      where: { name: { in: dto.roles } },
    });

    if (matchedRoles.length !== dto.roles.length) {
      throw new BadRequestException('One or more specified role names are invalid or not configured');
    }

    // Transactional role swap
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: matchedRoles.map((r) => ({
          userId: id,
          roleId: r.id,
        })),
      }),
    ]);

    // If AGENT role added, ensure agentProfile exists
    if (dto.roles.includes('AGENT' as any)) {
      const existingProfile = await this.prisma.agentProfile.findUnique({
        where: { userId: id },
      });
      if (!existingProfile) {
        await this.prisma.agentProfile.create({
          data: {
            userId: id,
            agentCode: `NK-AGT-${Date.now().toString(36).toUpperCase().slice(-5)}`,
            agencyName: 'NIMI KINGS LTD',
          },
        });
      }
    }

    await this.auditService.log({
      userId: adminId,
      action: 'ADMIN_USER_ROLES_UPDATED',
      entityType: 'User',
      entityId: id,
      oldValues: { roles: oldRoles },
      newValues: { roles: dto.roles, reason: dto.reason },
    });

    return {
      message: 'User roles updated successfully',
      userId: id,
      previousRoles: oldRoles,
      assignedRoles: dto.roles,
    };
  }

  /**
   * Direct provisioning of staff or verified property agents by administrators.
   */
  async createStaffUser(dto: CreateStaffUserDto, adminId: string) {
    const emailNormalized = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existing) {
      throw new BadRequestException(`A user with email '${emailNormalized}' already exists`);
    }

    const role = await this.prisma.role.findFirst({
      where: { name: dto.role },
    });

    if (!role) {
      throw new BadRequestException(`Role '${dto.role}' not found in the system`);
    }

    const temporaryPassword = dto.password || `NK@${Math.random().toString(36).slice(-6)}!2026`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const newUser = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: emailNormalized,
        phone: dto.phone || null,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        userRoles: {
          create: {
            roleId: role.id,
          },
        },
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    let agentProfile = null;
    if (dto.role === 'AGENT') {
      const serializedSpecialties = dto.specialties ? JSON.stringify(dto.specialties) : null;
      agentProfile = await this.prisma.agentProfile.create({
        data: {
          userId: newUser.id,
          agentCode: `NK-AGT-${Date.now().toString(36).toUpperCase().slice(-5)}`,
          agencyName: dto.agencyName || 'NIMI KINGS LTD',
          licenseNumber: dto.licenseNumber || null,
          specialties: serializedSpecialties,
        },
      });
    }

    await this.auditService.log({
      userId: adminId,
      action: 'ADMIN_STAFF_USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      newValues: {
        email: newUser.email,
        role: dto.role,
        agentCode: agentProfile?.agentCode,
      },
    });

    return {
      message: 'Staff user provisioned successfully',
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        status: newUser.status,
        roles: newUser.userRoles.map((ur) => ur.role.name),
        agentCode: agentProfile?.agentCode || null,
        createdAt: newUser.createdAt,
      },
      credentials: {
        temporaryPassword,
        note: 'Provide this temporary password securely to the staff member upon initial onboarding.',
      },
    };
  }
}
