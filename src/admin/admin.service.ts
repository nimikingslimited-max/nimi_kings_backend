import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';

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
}
