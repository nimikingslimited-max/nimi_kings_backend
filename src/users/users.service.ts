import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { FavoriteQueryDto } from './dto/favorite-query.dto.js';
import { SubmitKycDto } from './dto/submit-kyc.dto.js';
import { ReviewKycDto, KycReviewDecision } from './dto/review-kyc.dto.js';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto.js';
import { DeactivateAccountDto } from './dto/deactivate-account.dto.js';
import { AgentPropertyQueryDto } from './dto/agent-property-query.dto.js';
import { AgentLeadQueryDto } from './dto/agent-lead-query.dto.js';
import { UpdateAgentLeadDto } from './dto/update-agent-lead.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        agentProfile: true,
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles,
      customerProfile: user.customerProfile,
      agentProfile: user.agentProfile,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        agentProfile: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    // Check phone conflict if phone is being changed
    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: dto.phone, id: { not: userId } },
      });
      if (existingPhone) {
        throw new BadRequestException(
          'This phone number is already registered to another account',
        );
      }
    }

    // 1. Update Core User details
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
    });

    // 2. Update Customer Profile
    const customerProfileData = {
      ...(dto.dateOfBirth !== undefined
        ? { dateOfBirth: new Date(dto.dateOfBirth) }
        : {}),
      ...(dto.occupation !== undefined ? { occupation: dto.occupation } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.state !== undefined ? { state: dto.state } : {}),
      ...(dto.country !== undefined ? { country: dto.country } : {}),
      ...(dto.profileImage !== undefined
        ? { profileImage: dto.profileImage }
        : {}),
    };

    if (Object.keys(customerProfileData).length > 0) {
      await this.prisma.customerProfile.upsert({
        where: { userId },
        update: customerProfileData,
        create: {
          userId,
          ...customerProfileData,
        },
      });
    }

    // 3. If user has an Agent Profile, update agent-specific fields
    if (user.agentProfile && (dto.bio !== undefined || dto.profileImage !== undefined)) {
      await this.prisma.agentProfile.update({
        where: { userId },
        data: {
          ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
          ...(dto.profileImage !== undefined
            ? { profileImage: dto.profileImage }
            : {}),
        },
      });
    }

    await this.auditService.log({
      userId,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'User',
      entityId: userId,
      newValues: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        city: dto.city,
        state: dto.state,
      },
    });

    return this.getProfile(userId);
  }

  async getCustomerDashboard(userId: string) {
    const profile = await this.getProfile(userId);

    // 1. Calculate Profile Completion Percentage
    const profileFields = [
      profile.firstName,
      profile.lastName,
      profile.email,
      profile.phone,
      profile.customerProfile?.dateOfBirth,
      profile.customerProfile?.occupation,
      profile.customerProfile?.address,
      profile.customerProfile?.city,
      profile.customerProfile?.state,
      profile.customerProfile?.profileImage,
      profile.customerProfile?.kycStatus === 'VERIFIED',
    ];
    const completedFields = profileFields.filter(Boolean).length;
    const profileCompletionPercentage = Math.round(
      (completedFields / profileFields.length) * 100,
    );

    const now = new Date();

    // 2. Fetch parallel metrics and recent activities
    const [
      totalEnquiries,
      activeEnquiries,
      resolvedEnquiries,
      totalInspections,
      upcomingInspectionsCount,
      completedInspections,
      unreadNotificationsCount,
      activeConversationsCount,
      totalSavedProperties,
      upcomingSiteVisits,
      recentEnquiries,
      assignedAgents,
      recentNotifications,
      recentSavedProperties,
    ] = await Promise.all([
      // Enquiries counts
      this.prisma.propertyEnquiry.count({ where: { customerId: userId } }),
      this.prisma.propertyEnquiry.count({
        where: {
          customerId: userId,
          status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.propertyEnquiry.count({
        where: {
          customerId: userId,
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      }),

      // Inspections counts
      this.prisma.propertyInspection.count({ where: { customerId: userId } }),
      this.prisma.propertyInspection.count({
        where: {
          customerId: userId,
          status: { in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED'] },
          scheduledAt: { gte: now },
        },
      }),
      this.prisma.propertyInspection.count({
        where: { customerId: userId, status: 'COMPLETED' },
      }),

      // Unread notifications count
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),

      // Active conversations
      this.prisma.conversationParticipant.count({
        where: { userId },
      }),

      // Total saved properties count
      this.prisma.savedProperty.count({
        where: { userId },
      }),

      // Next 5 upcoming inspections
      this.prisma.propertyInspection.findMany({
        where: {
          customerId: userId,
          status: { in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED'] },
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
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
              agentProfile: {
                select: { agentCode: true, profileImage: true },
              },
            },
          },
        },
      }),

      // Last 5 inquiries
      this.prisma.propertyEnquiry.findMany({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              propertyType: true,
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

      // Assigned dedicated agents (from customer_agents)
      this.prisma.customerAgent.findMany({
        where: { customerId: userId, status: 'ACTIVE' },
        take: 3,
      }),

      // Last 5 notifications
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Top 3 recent saved properties
      this.prisma.savedProperty.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              propertyType: true,
              city: true,
              state: true,
              media: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
              listings: {
                where: { status: 'PUBLISHED' },
                take: 1,
                select: { price: true, currency: true, listingType: true },
              },
            },
          },
        },
      }),
    ]);

    // Fetch assigned agents user data
    const agentIds = assignedAgents.map((a) => a.agentId);
    const agentUsers = await this.prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        agentProfile: {
          select: { agentCode: true, bio: true, profileImage: true },
        },
      },
    });

    return {
      user: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        roles: profile.roles,
        profileImage: profile.customerProfile?.profileImage,
        kycStatus: profile.customerProfile?.kycStatus || 'NOT_SUBMITTED',
        profileCompletionPercentage,
      },
      stats: {
        enquiries: {
          total: totalEnquiries,
          active: activeEnquiries,
          resolved: resolvedEnquiries,
        },
        inspections: {
          total: totalInspections,
          upcoming: upcomingInspectionsCount,
          completed: completedInspections,
        },
        savedPropertiesCount: totalSavedProperties,
        unreadNotificationsCount,
        activeConversationsCount,
      },
      upcomingSiteVisits,
      recentEnquiries,
      savedPropertiesPreview: recentSavedProperties.map((s) => ({
        id: s.property.id,
        propertyCode: s.property.propertyCode,
        title: s.property.title,
        propertyType: s.property.propertyType,
        city: s.property.city,
        state: s.property.state,
        primaryMedia: s.property.media[0] || null,
        listing: s.property.listings[0] || null,
        savedAt: s.createdAt,
      })),
      assignedConsultants: agentUsers,
      recentNotifications,
    };
  }

  async getAgentDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agentProfile: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    // If agentProfile doesn't exist, create an auto-generated one
    let agentProfile = user.agentProfile;
    if (!agentProfile) {
      const agentCode = `NK-AG-${Math.floor(1000 + Math.random() * 9000)}`;
      agentProfile = await this.prisma.agentProfile.create({
        data: {
          userId,
          agentCode,
        },
      });
    }

    // 1. Identify all property IDs assigned to or created by this agent
    const [assignedProps, createdProps] = await Promise.all([
      this.prisma.propertyAgent.findMany({
        where: { agentId: userId, status: 'ACTIVE' },
        select: { propertyId: true },
      }),
      this.prisma.property.findMany({
        where: { createdById: userId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    const propertyIds = Array.from(
      new Set([
        ...assignedProps.map((p) => p.propertyId),
        ...createdProps.map((p) => p.id),
      ]),
    );

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const totalPropertiesCount = propertyIds.length;

    // 2. Parallel Metrics Execution
    const [
      activePropertiesCount,
      totalAssignedLeads,
      newLeadsCount,
      inProgressLeadsCount,
      resolvedLeadsCount,
      totalInspectionsCount,
      todayInspectionsCount,
      upcomingInspectionsCount,
      completedInspectionsCount,
      rescheduledInspectionsCount,
      assignedClientsCount,
      successfulTransactions,
      unreadNotificationsCount,
      activeConversationsCount,
    ] = await Promise.all([
      this.prisma.property.count({
        where: {
          id: { in: propertyIds },
          deletedAt: null,
          listings: { some: { status: 'PUBLISHED' } },
        },
      }),
      this.prisma.propertyEnquiry.count({ where: { agentId: userId } }),
      this.prisma.propertyEnquiry.count({
        where: { agentId: userId, status: 'NEW' },
      }),
      this.prisma.propertyEnquiry.count({
        where: { agentId: userId, status: 'IN_PROGRESS' },
      }),
      this.prisma.propertyEnquiry.count({
        where: { agentId: userId, status: { in: ['RESOLVED', 'CLOSED'] } },
      }),
      this.prisma.propertyInspection.count({ where: { agentId: userId } }),
      this.prisma.propertyInspection.count({
        where: {
          agentId: userId,
          scheduledAt: { gte: startOfToday, lte: endOfToday },
          status: { in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED'] },
        },
      }),
      this.prisma.propertyInspection.count({
        where: {
          agentId: userId,
          scheduledAt: { gt: endOfToday },
          status: { in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED'] },
        },
      }),
      this.prisma.propertyInspection.count({
        where: { agentId: userId, status: 'COMPLETED' },
      }),
      this.prisma.propertyInspection.count({
        where: { agentId: userId, rescheduledAt: { not: null } },
      }),
      this.prisma.customerAgent.count({
        where: { agentId: userId, status: 'ACTIVE' },
      }),
      this.prisma.transaction.findMany({
        where: { agentId: userId, status: 'SUCCESSFUL' },
        select: { amount: true, currency: true },
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
      this.prisma.conversationParticipant.count({
        where: { userId },
      }),
    ]);

    // 3. Parallel Actionable Widgets & Feeds
    const [
      todayVisits,
      upcomingVisits,
      urgentLeads,
      myPropertiesPreview,
      reviews,
    ] = await Promise.all([
      this.prisma.propertyInspection.findMany({
        where: {
          agentId: userId,
          scheduledAt: { gte: startOfToday, lte: endOfToday },
          status: { in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED'] },
        },
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
              media: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              customerProfile: {
                select: { profileImage: true },
              },
            },
          },
        },
      }),
      this.prisma.propertyInspection.findMany({
        where: {
          agentId: userId,
          scheduledAt: { gt: endOfToday },
          status: { in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED'] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
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
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              customerProfile: {
                select: { profileImage: true },
              },
            },
          },
        },
      }),
      this.prisma.propertyEnquiry.findMany({
        where: {
          agentId: userId,
          status: { in: ['NEW', 'IN_PROGRESS'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              propertyType: true,
              city: true,
              state: true,
              media: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              customerProfile: {
                select: { profileImage: true },
              },
            },
          },
        },
      }),
      this.prisma.property.findMany({
        where: {
          id: { in: propertyIds },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          propertyCode: true,
          title: true,
          propertyType: true,
          city: true,
          state: true,
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, thumbnailUrl: true },
          },
          listings: {
            where: { status: 'PUBLISHED' },
            take: 1,
            select: { price: true, currency: true, listingType: true, status: true },
          },
          verification: {
            select: { status: true, riskLevel: true, completedAt: true },
          },
        },
      }),
      this.prisma.propertyInspection.findMany({
        where: {
          agentId: userId,
          customerRating: { not: null },
        },
        orderBy: { feedbackSubmittedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerRating: true,
          customerFeedback: true,
          feedbackSubmittedAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              customerProfile: {
                select: { profileImage: true },
              },
            },
          },
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
            },
          },
        },
      }),
    ]);

    // Calculate rating & review metrics
    const totalReviews = await this.prisma.propertyInspection.count({
      where: {
        agentId: userId,
        customerRating: { not: null },
      },
    });

    const ratingAggregate = await this.prisma.propertyInspection.aggregate({
      where: {
        agentId: userId,
        customerRating: { not: null },
      },
      _avg: {
        customerRating: true,
      },
    });

    const averageRating = ratingAggregate._avg.customerRating
      ? Number(ratingAggregate._avg.customerRating.toFixed(1))
      : 5.0;

    const totalClosedVolume = successfulTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    return {
      agent: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        roles,
        agentCode: agentProfile.agentCode,
        licenseNumber: agentProfile.licenseNumber,
        agencyName: agentProfile.agencyName,
        specialties: agentProfile.specialties,
        yearsOfExperience: agentProfile.yearsOfExperience,
        officeAddress: agentProfile.officeAddress,
        bio: agentProfile.bio,
        profileImage: agentProfile.profileImage,
        joinedAt: agentProfile.joinedAt,
      },
      stats: {
        properties: {
          total: totalPropertiesCount,
          active: activePropertiesCount,
        },
        leads: {
          total: totalAssignedLeads,
          new: newLeadsCount,
          inProgress: inProgressLeadsCount,
          resolved: resolvedLeadsCount,
        },
        inspections: {
          total: totalInspectionsCount,
          today: todayInspectionsCount,
          upcoming: upcomingInspectionsCount,
          completed: completedInspectionsCount,
          rescheduled: rescheduledInspectionsCount,
        },
        clients: {
          totalAssigned: assignedClientsCount,
        },
        performance: {
          averageRating,
          totalReviews,
          closedDealsCount: successfulTransactions.length,
          totalClosedVolume,
          currency: 'NGN',
        },
        unreadNotificationsCount,
        activeConversationsCount,
      },
      todayVisits: todayVisits.map((v) => ({
        id: v.id,
        scheduledAt: v.scheduledAt,
        status: v.status,
        location: v.location,
        notes: v.notes,
        property: {
          id: v.property.id,
          propertyCode: v.property.propertyCode,
          title: v.property.title,
          propertyType: v.property.propertyType,
          address: v.property.address,
          city: v.property.city,
          state: v.property.state,
          primaryMedia: v.property.media[0] || null,
        },
        customer: {
          id: v.customer.id,
          name: `${v.customer.firstName} ${v.customer.lastName}`,
          email: v.customer.email,
          phone: v.customer.phone,
          profileImage: v.customer.customerProfile?.profileImage || null,
        },
      })),
      upcomingVisits: upcomingVisits.map((v) => ({
        id: v.id,
        scheduledAt: v.scheduledAt,
        status: v.status,
        location: v.location,
        notes: v.notes,
        property: {
          id: v.property.id,
          propertyCode: v.property.propertyCode,
          title: v.property.title,
          propertyType: v.property.propertyType,
          address: v.property.address,
          city: v.property.city,
          state: v.property.state,
          primaryMedia: v.property.media[0] || null,
        },
        customer: {
          id: v.customer.id,
          name: `${v.customer.firstName} ${v.customer.lastName}`,
          email: v.customer.email,
          phone: v.customer.phone,
          profileImage: v.customer.customerProfile?.profileImage || null,
        },
      })),
      urgentLeads: urgentLeads.map((l) => ({
        id: l.id,
        type: l.type,
        message: l.message,
        status: l.status,
        createdAt: l.createdAt,
        property: {
          id: l.property.id,
          propertyCode: l.property.propertyCode,
          title: l.property.title,
          propertyType: l.property.propertyType,
          city: l.property.city,
          state: l.property.state,
          primaryMedia: l.property.media[0] || null,
        },
        customer: {
          id: l.customer.id,
          name: `${l.customer.firstName} ${l.customer.lastName}`,
          email: l.customer.email,
          phone: l.customer.phone,
          profileImage: l.customer.customerProfile?.profileImage || null,
        },
      })),
      myPropertiesPreview: myPropertiesPreview.map((p) => ({
        id: p.id,
        propertyCode: p.propertyCode,
        title: p.title,
        propertyType: p.propertyType,
        status: p.listings[0]?.status || 'UNLISTED',
        city: p.city,
        state: p.state,
        primaryMedia: p.media[0] || null,
        listing: p.listings[0] || null,
        verification: p.verification || null,
      })),
      recentClientFeedback: reviews.map((r) => ({
        id: r.id,
        rating: r.customerRating,
        feedback: r.customerFeedback,
        submittedAt: r.feedbackSubmittedAt,
        customerName: `${r.customer.firstName} ${r.customer.lastName}`,
        customerImage: r.customer.customerProfile?.profileImage || null,
        propertyTitle: r.property.title,
        propertyCode: r.property.propertyCode,
      })),
    };
  }

  async getAgentProperties(userId: string, query: AgentPropertyQueryDto) {
    // 1. Get all property IDs assigned to or created by this agent
    const [assignedProps, createdProps] = await Promise.all([
      this.prisma.propertyAgent.findMany({
        where: { agentId: userId, status: 'ACTIVE' },
        select: { propertyId: true },
      }),
      this.prisma.property.findMany({
        where: { createdById: userId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    const assignedIds = new Set(assignedProps.map((p) => p.propertyId));
    const createdIds = new Set(createdProps.map((p) => p.id));
    const allPropertyIds = Array.from(new Set([...assignedIds, ...createdIds]));

    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      id: { in: allPropertyIds },
      deletedAt: null,
    };

    if (query.propertyType) {
      where.propertyType = query.propertyType;
    }

    if (query.state) {
      where.state = { contains: query.state, mode: 'insensitive' };
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { propertyCode: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.listingType || query.status) {
      where.listings = {
        some: {
          ...(query.listingType ? { listingType: query.listingType } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
      };
    }

    const [total, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          media: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          listings: {
            orderBy: { createdAt: 'desc' },
          },
          verification: {
            select: {
              status: true,
              riskLevel: true,
              completedAt: true,
              verificationCode: true,
            },
          },
          _count: {
            select: {
              enquiries: true,
              inspections: true,
              savedByUsers: true,
            },
          },
        },
      }),
    ]);

    const propIds = properties.map((p) => p.id);
    const [newEnquiriesPerProp, completedInspectionsPerProp] = await Promise.all([
      this.prisma.propertyEnquiry.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propIds },
          status: { in: ['NEW', 'IN_PROGRESS'] },
        },
        _count: { id: true },
      }),
      this.prisma.propertyInspection.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propIds },
          status: 'COMPLETED',
        },
        _count: { id: true },
      }),
    ]);

    const newEnquiriesMap = new Map<string, number>();
    for (const item of newEnquiriesPerProp) {
      newEnquiriesMap.set(item.propertyId, item._count.id);
    }

    const completedInspectionsMap = new Map<string, number>();
    for (const item of completedInspectionsPerProp) {
      completedInspectionsMap.set(item.propertyId, item._count.id);
    }

    const data = properties.map((p) => {
      const isAssigned = assignedIds.has(p.id);
      const isCreator = createdIds.has(p.id);
      const assignmentType =
        isAssigned && isCreator
          ? 'CREATOR_AND_ASSIGNED'
          : isCreator
            ? 'CREATOR'
            : 'ASSIGNED_AGENT';

      return {
        id: p.id,
        propertyCode: p.propertyCode,
        title: p.title,
        description: p.description,
        propertyType: p.propertyType,
        address: p.address,
        city: p.city,
        state: p.state,
        country: p.country,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        parkingSpaces: p.parkingSpaces,
        landSize: p.landSize ? Number(p.landSize) : null,
        landSizeUnit: p.landSizeUnit,
        assignmentType,
        primaryMedia: p.media.find((m) => m.isPrimary) || p.media[0] || null,
        mediaCount: p.media.length,
        primaryListing:
          p.listings.find((l) => l.status === 'PUBLISHED') ||
          p.listings[0] ||
          null,
        allListings: p.listings,
        verification: p.verification || {
          status: 'NOT_SUBMITTED',
          riskLevel: 'LOW',
        },
        metrics: {
          totalEnquiries: p._count.enquiries,
          activeEnquiries: newEnquiriesMap.get(p.id) || 0,
          totalInspections: p._count.inspections,
          completedInspections: completedInspectionsMap.get(p.id) || 0,
          wishlistSaves: p._count.savedByUsers,
        },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getAgentPropertyDetails(userId: string, propertyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        deletedAt: null,
      },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        listings: { orderBy: { createdAt: 'desc' } },
        features: { include: { feature: true } },
        verification: true,
        assignedAgents: {
          where: { status: 'ACTIVE' },
          select: { agentId: true, assignedAt: true },
        },
        _count: {
          select: {
            savedByUsers: true,
            enquiries: true,
            inspections: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const isAssigned = property.assignedAgents.some((a) => a.agentId === userId);
    const isCreator = property.createdById === userId;

    if (!isAdmin && !isAssigned && !isCreator) {
      throw new ForbiddenException(
        'You do not have permission to view agent metrics for this property',
      );
    }

    const [recentEnquiries, upcomingInspections, pastInspections, customerReviews] =
      await Promise.all([
        this.prisma.propertyEnquiry.findMany({
          where: { propertyId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                customerProfile: { select: { profileImage: true } },
              },
            },
          },
        }),
        this.prisma.propertyInspection.findMany({
          where: {
            propertyId,
            status: { in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED'] },
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                customerProfile: { select: { profileImage: true } },
              },
            },
          },
        }),
        this.prisma.propertyInspection.findMany({
          where: {
            propertyId,
            status: { in: ['COMPLETED', 'CANCELLED'] },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 5,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                customerProfile: { select: { profileImage: true } },
              },
            },
          },
        }),
        this.prisma.propertyInspection.findMany({
          where: {
            propertyId,
            customerRating: { not: null },
          },
          orderBy: { feedbackSubmittedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            customerRating: true,
            customerFeedback: true,
            feedbackSubmittedAt: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                customerProfile: { select: { profileImage: true } },
              },
            },
          },
        }),
      ]);

    const ratingAggregate = await this.prisma.propertyInspection.aggregate({
      where: {
        propertyId,
        customerRating: { not: null },
      },
      _avg: { customerRating: true },
      _count: { customerRating: true },
    });

    return {
      property: {
        id: property.id,
        propertyCode: property.propertyCode,
        title: property.title,
        description: property.description,
        propertyType: property.propertyType,
        address: property.address,
        city: property.city,
        state: property.state,
        country: property.country,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parkingSpaces: property.parkingSpaces,
        landSize: property.landSize ? Number(property.landSize) : null,
        landSizeUnit: property.landSizeUnit,
        latitude: property.latitude ? Number(property.latitude) : null,
        longitude: property.longitude ? Number(property.longitude) : null,
        media: property.media,
        listings: property.listings,
        features: property.features.map((f) => f.feature),
        verification: property.verification,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
      },
      metrics: {
        totalEnquiries: property._count.enquiries,
        totalInspections: property._count.inspections,
        wishlistSaves: property._count.savedByUsers,
        averageCustomerRating: ratingAggregate._avg.customerRating
          ? Number(ratingAggregate._avg.customerRating.toFixed(1))
          : null,
        totalReviewsCount: ratingAggregate._count.customerRating || 0,
      },
      leads: recentEnquiries.map((e) => ({
        id: e.id,
        type: e.type,
        message: e.message,
        agentNotes: e.agentNotes,
        status: e.status,
        createdAt: e.createdAt,
        customer: {
          id: e.customer.id,
          name: `${e.customer.firstName} ${e.customer.lastName}`,
          email: e.customer.email,
          phone: e.customer.phone,
          profileImage: e.customer.customerProfile?.profileImage || null,
        },
      })),
      upcomingVisits: upcomingInspections.map((i) => ({
        id: i.id,
        scheduledAt: i.scheduledAt,
        status: i.status,
        location: i.location,
        notes: i.notes,
        customer: {
          id: i.customer.id,
          name: `${i.customer.firstName} ${i.customer.lastName}`,
          email: i.customer.email,
          phone: i.customer.phone,
          profileImage: i.customer.customerProfile?.profileImage || null,
        },
      })),
      pastVisits: pastInspections.map((i) => ({
        id: i.id,
        scheduledAt: i.scheduledAt,
        status: i.status,
        completedAt: i.completedAt,
        agentReport: i.agentReport,
        outcome: i.outcome,
        customer: {
          id: i.customer.id,
          name: `${i.customer.firstName} ${i.customer.lastName}`,
          email: i.customer.email,
          phone: i.customer.phone,
          profileImage: i.customer.customerProfile?.profileImage || null,
        },
      })),
      reviews: customerReviews.map((r) => ({
        id: r.id,
        rating: r.customerRating,
        feedback: r.customerFeedback,
        submittedAt: r.feedbackSubmittedAt,
        customerName: `${r.customer.firstName} ${r.customer.lastName}`,
        customerImage: r.customer.customerProfile?.profileImage || null,
      })),
    };
  }

  // ==========================================
  // AGENT LEADS & CLIENT CRM
  // ==========================================

  async getAgentLeads(userId: string, query: AgentLeadQueryDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyEnquiryWhereInput = {
      agentId: userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { customer: { firstName: { contains: term, mode: 'insensitive' } } },
        { customer: { lastName: { contains: term, mode: 'insensitive' } } },
        { customer: { email: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term, mode: 'insensitive' } } },
        { property: { title: { contains: term, mode: 'insensitive' } } },
        { property: { propertyCode: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [
      total,
      newCount,
      inProgressCount,
      resolvedCount,
      closedCount,
      leads,
    ] = await Promise.all([
      this.prisma.propertyEnquiry.count({ where }),
      this.prisma.propertyEnquiry.count({
        where: { agentId: userId, status: 'NEW' },
      }),
      this.prisma.propertyEnquiry.count({
        where: { agentId: userId, status: 'IN_PROGRESS' },
      }),
      this.prisma.propertyEnquiry.count({
        where: { agentId: userId, status: 'RESOLVED' },
      }),
      this.prisma.propertyEnquiry.count({
        where: { agentId: userId, status: 'CLOSED' },
      }),
      this.prisma.propertyEnquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              customerProfile: {
                select: {
                  profileImage: true,
                  city: true,
                  state: true,
                  kycStatus: true,
                },
              },
            },
          },
          property: {
            select: {
              id: true,
              propertyCode: true,
              title: true,
              propertyType: true,
              city: true,
              state: true,
              media: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
              listings: {
                where: { status: 'PUBLISHED' },
                take: 1,
                select: { price: true, currency: true, listingType: true },
              },
            },
          },
        },
      }),
    ]);

    const data = leads.map((l) => ({
      id: l.id,
      type: l.type,
      message: l.message,
      agentNotes: l.agentNotes,
      status: l.status,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      customer: {
        id: l.customer.id,
        name: `${l.customer.firstName} ${l.customer.lastName}`,
        email: l.customer.email,
        phone: l.customer.phone,
        profileImage: l.customer.customerProfile?.profileImage || null,
        city: l.customer.customerProfile?.city || null,
        state: l.customer.customerProfile?.state || null,
        kycStatus: l.customer.customerProfile?.kycStatus || 'NOT_SUBMITTED',
      },
      property: {
        id: l.property.id,
        propertyCode: l.property.propertyCode,
        title: l.property.title,
        propertyType: l.property.propertyType,
        city: l.property.city,
        state: l.property.state,
        primaryMedia: l.property.media[0] || null,
        listing: l.property.listings[0] || null,
      },
    }));

    return {
      summary: {
        total,
        new: newCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount,
      },
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getAgentLeadById(userId: string, leadId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    const lead = await this.prisma.propertyEnquiry.findUnique({
      where: { id: leadId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
            customerProfile: true,
          },
        },
        property: {
          include: {
            media: {
              where: { isPrimary: true },
              take: 1,
            },
            listings: {
              where: { status: 'PUBLISHED' },
              take: 1,
            },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead enquiry not found');
    }

    if (!isAdmin && lead.agentId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this customer lead',
      );
    }

    const [pastCustomerEnquiries, customerInspections] = await Promise.all([
      this.prisma.propertyEnquiry.findMany({
        where: {
          customerId: lead.customerId,
          id: { not: leadId },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          message: true,
          status: true,
          createdAt: true,
          property: {
            select: { id: true, title: true, propertyCode: true },
          },
        },
      }),
      this.prisma.propertyInspection.findMany({
        where: { customerId: lead.customerId },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          location: true,
          notes: true,
          property: {
            select: { id: true, title: true, propertyCode: true },
          },
        },
      }),
    ]);

    return {
      lead: {
        id: lead.id,
        type: lead.type,
        message: lead.message,
        agentNotes: lead.agentNotes,
        status: lead.status,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      },
      customer: {
        id: lead.customer.id,
        name: `${lead.customer.firstName} ${lead.customer.lastName}`,
        email: lead.customer.email,
        phone: lead.customer.phone,
        memberSince: lead.customer.createdAt,
        profile: lead.customer.customerProfile,
      },
      property: {
        id: lead.property.id,
        propertyCode: lead.property.propertyCode,
        title: lead.property.title,
        propertyType: lead.property.propertyType,
        address: lead.property.address,
        city: lead.property.city,
        state: lead.property.state,
        primaryMedia: lead.property.media[0] || null,
        listing: lead.property.listings[0] || null,
      },
      customerHistory: {
        otherEnquiries: pastCustomerEnquiries,
        inspections: customerInspections,
      },
    };
  }

  async updateAgentLead(
    userId: string,
    leadId: string,
    dto: UpdateAgentLeadDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    const lead = await this.prisma.propertyEnquiry.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead enquiry not found');
    }

    if (!isAdmin && lead.agentId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this customer lead',
      );
    }

    const updated = await this.prisma.propertyEnquiry.update({
      where: { id: leadId },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.agentNotes !== undefined ? { agentNotes: dto.agentNotes } : {}),
      },
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
            title: true,
            propertyCode: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE_AGENT_LEAD',
      entityType: 'PropertyEnquiry',
      entityId: leadId,
      newValues: {
        previousStatus: lead.status,
        newStatus: dto.status,
        hasNotesUpdate: dto.agentNotes !== undefined,
      },
    });

    return {
      message: 'Lead updated successfully',
      lead: updated,
    };
  }

  async getAgentClients(
    userId: string,
    page = 1,
    limit = 10,
    search?: string,
  ) {
    const pageNum = page > 0 ? Number(page) : 1;
    const limitNum = limit > 0 ? Number(limit) : 10;
    const skip = (pageNum - 1) * limitNum;

    // Retrieve all customer IDs interacting with this agent
    const [assignedClients, leadClients, inspectionClients] =
      await Promise.all([
        this.prisma.customerAgent.findMany({
          where: { agentId: userId, status: 'ACTIVE' },
          select: { customerId: true },
        }),
        this.prisma.propertyEnquiry.findMany({
          where: { agentId: userId },
          select: { customerId: true },
        }),
        this.prisma.propertyInspection.findMany({
          where: { agentId: userId },
          select: { customerId: true },
        }),
      ]);

    const allCustomerIds = Array.from(
      new Set([
        ...assignedClients.map((c) => c.customerId),
        ...leadClients.map((c) => c.customerId),
        ...inspectionClients.map((c) => c.customerId),
      ]),
    );

    const where: Prisma.UserWhereInput = {
      id: { in: allCustomerIds },
      deletedAt: null,
    };

    if (search) {
      const term = search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          customerProfile: {
            select: {
              profileImage: true,
              city: true,
              state: true,
              occupation: true,
              kycStatus: true,
            },
          },
          _count: {
            select: {
              enquiriesSent: true,
              inspectionsAsCustomer: true,
              savedProperties: true,
            },
          },
        },
      }),
    ]);

    // For each customer, get their latest enquiry with this agent
    const customerIds = customers.map((c) => c.id);
    const latestEnquiries = await this.prisma.propertyEnquiry.findMany({
      where: {
        customerId: { in: customerIds },
        agentId: userId,
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['customerId'],
      select: {
        customerId: true,
        type: true,
        status: true,
        createdAt: true,
        property: {
          select: { id: true, title: true, propertyCode: true },
        },
      },
    });

    const latestEnquiryMap = new Map();
    for (const e of latestEnquiries) {
      latestEnquiryMap.set(e.customerId, e);
    }

    const data = customers.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phone: c.phone,
      joinedAt: c.createdAt,
      profile: c.customerProfile,
      metrics: {
        totalEnquiries: c._count.enquiriesSent,
        totalInspections: c._count.inspectionsAsCustomer,
        wishlistSaves: c._count.savedProperties,
      },
      latestInteraction: latestEnquiryMap.get(c.id) || null,
    }));

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPreviousPage: pageNum > 1,
      },
    };
  }

  async getMyAssignedAgents(userId: string) {
    const relationships = await this.prisma.customerAgent.findMany({
      where: { customerId: userId, status: 'ACTIVE' },
      orderBy: { assignedAt: 'desc' },
    });

    const agentIds = relationships.map((r) => r.agentId);
    const agents = await this.prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        agentProfile: {
          select: {
            agentCode: true,
            licenseNumber: true,
            bio: true,
            profileImage: true,
          },
        },
      },
    });

    return {
      count: agents.length,
      data: agents,
    };
  }

  async addToFavorites(userId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true, title: true, propertyCode: true },
    });

    if (!property) {
      throw new NotFoundException(
        'Property not found or is no longer available',
      );
    }

    await this.prisma.savedProperty.upsert({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
      update: {},
      create: {
        userId,
        propertyId,
      },
    });

    return {
      message: 'Property successfully added to your saved favorites',
      isFavorite: true,
      property: {
        id: property.id,
        title: property.title,
        propertyCode: property.propertyCode,
      },
    };
  }

  async removeFromFavorites(userId: string, propertyId: string) {
    await this.prisma.savedProperty.deleteMany({
      where: {
        userId,
        propertyId,
      },
    });

    return {
      message: 'Property removed from your saved favorites',
      isFavorite: false,
    };
  }

  async checkIsFavorite(userId: string, propertyId: string) {
    const saved = await this.prisma.savedProperty.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    return {
      propertyId,
      isFavorite: !!saved,
    };
  }

  async getFavorites(userId: string, query: FavoriteQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;

    const [total, favorites] = await Promise.all([
      this.prisma.savedProperty.count({ where: { userId } }),
      this.prisma.savedProperty.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          property: {
            include: {
              media: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
              listings: {
                where: { status: 'PUBLISHED' },
                take: 1,
                select: {
                  id: true,
                  price: true,
                  currency: true,
                  listingType: true,
                  status: true,
                },
              },
              verification: {
                select: {
                  status: true,
                  riskLevel: true,
                  completedAt: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: favorites.map((fav) => ({
        savedAt: fav.createdAt,
        property: {
          id: fav.property.id,
          propertyCode: fav.property.propertyCode,
          title: fav.property.title,
          description: fav.property.description,
          propertyType: fav.property.propertyType,
          address: fav.property.address,
          city: fav.property.city,
          state: fav.property.state,
          country: fav.property.country,
          bedrooms: fav.property.bedrooms,
          bathrooms: fav.property.bathrooms,
          parkingSpaces: fav.property.parkingSpaces,
          landSize: fav.property.landSize,
          landSizeUnit: fav.property.landSizeUnit,
          primaryMedia: fav.property.media[0] || null,
          activeListing: fav.property.listings[0] || null,
          verification: fav.property.verification || null,
        },
      })),
    };
  }

  // ==========================================
  // CUSTOMER KYC & IDENTITY VERIFICATION
  // ==========================================

  async getKycStatus(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        kycStatus: 'NOT_SUBMITTED',
        idType: null,
        idNumber: null,
        idDocumentUrl: null,
        proofOfAddressUrl: null,
        kycSubmittedAt: null,
        kycReviewedAt: null,
        kycRejectionReason: null,
      };
    }

    return {
      kycStatus: profile.kycStatus,
      idType: profile.idType,
      idNumber: profile.idNumber
        ? `***${profile.idNumber.slice(-4)}`
        : null,
      idNumberFull: profile.idNumber,
      idDocumentUrl: profile.idDocumentUrl,
      proofOfAddressUrl: profile.proofOfAddressUrl,
      kycSubmittedAt: profile.kycSubmittedAt,
      kycReviewedAt: profile.kycReviewedAt,
      kycRejectionReason: profile.kycRejectionReason,
    };
  }

  async submitKyc(userId: string, dto: SubmitKycDto) {
    const existing = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (existing?.kycStatus === 'VERIFIED') {
      throw new BadRequestException(
        'Your identity has already been verified and cannot be modified. Please contact support if you need to update documents.',
      );
    }

    const updatedProfile = await this.prisma.customerProfile.upsert({
      where: { userId },
      update: {
        idType: dto.idType,
        idNumber: dto.idNumber,
        idDocumentUrl: dto.idDocumentUrl,
        proofOfAddressUrl: dto.proofOfAddressUrl || null,
        kycStatus: 'PENDING',
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
      create: {
        userId,
        idType: dto.idType,
        idNumber: dto.idNumber,
        idDocumentUrl: dto.idDocumentUrl,
        proofOfAddressUrl: dto.proofOfAddressUrl || null,
        kycStatus: 'PENDING',
        kycSubmittedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      action: 'CUSTOMER_KYC_SUBMITTED',
      entityType: 'CustomerProfile',
      entityId: updatedProfile.id,
      newValues: {
        idType: dto.idType,
        kycStatus: 'PENDING',
      },
    });

    return {
      message:
        'KYC documents submitted successfully. Our compliance team will review your submission shortly.',
      kycStatus: updatedProfile.kycStatus,
      idType: updatedProfile.idType,
      kycSubmittedAt: updatedProfile.kycSubmittedAt,
    };
  }

  async reviewKyc(
    adminId: string,
    customerId: string,
    dto: ReviewKycDto,
  ) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: customerId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    const isVerified = dto.status === KycReviewDecision.VERIFIED;

    const updated = await this.prisma.customerProfile.update({
      where: { userId: customerId },
      data: {
        kycStatus: isVerified ? 'VERIFIED' : 'REJECTED',
        kycReviewedAt: new Date(),
        kycRejectionReason: !isVerified
          ? dto.rejectionReason || 'Documents could not be verified'
          : null,
      },
    });

    // Notify customer of decision
    await this.prisma.notification
      .create({
        data: {
          userId: customerId,
          type: 'DOCUMENT_VERIFIED',
          title: isVerified
            ? 'KYC Identity Verified 🎉'
            : 'KYC Verification Update',
          message: isVerified
            ? 'Congratulations! Your identity documents have been approved by compliance. Your account is now fully verified.'
            : `Your KYC submission could not be verified.${dto.rejectionReason ? ` Reason: "${dto.rejectionReason}".` : ''} Please review and re-submit.`,
          data: {
            kycStatus: updated.kycStatus,
            rejectionReason: updated.kycRejectionReason,
          },
        },
      })
      .catch(() => {});

    await this.auditService.log({
      userId: adminId,
      action: isVerified
        ? 'CUSTOMER_KYC_APPROVED'
        : 'CUSTOMER_KYC_REJECTED',
      entityType: 'CustomerProfile',
      entityId: profile.id,
      newValues: {
        kycStatus: updated.kycStatus,
        rejectionReason: updated.kycRejectionReason,
      },
    });

    return {
      message: `Customer KYC has been ${updated.kycStatus.toLowerCase()} successfully`,
      kycStatus: updated.kycStatus,
      reviewedAt: updated.kycReviewedAt,
      rejectionReason: updated.kycRejectionReason,
    };
  }

  // ==========================================
  // SAVED SEARCHES & PROPERTY ALERTS
  // ==========================================

  async createSavedSearch(userId: string, dto: CreateSavedSearchDto) {
    const savedSearch = await this.prisma.savedSearch.create({
      data: {
        userId,
        title: dto.title,
        propertyType: dto.propertyType,
        listingType: dto.listingType,
        city: dto.city,
        state: dto.state,
        minPrice: dto.minPrice !== undefined ? new Prisma.Decimal(dto.minPrice) : null,
        maxPrice: dto.maxPrice !== undefined ? new Prisma.Decimal(dto.maxPrice) : null,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        notifyEmail: dto.notifyEmail !== undefined ? dto.notifyEmail : true,
        notifyPush: dto.notifyPush !== undefined ? dto.notifyPush : true,
      },
    });

    await this.auditService.log({
      userId,
      action: 'SAVED_SEARCH_CREATED',
      entityType: 'SavedSearch',
      entityId: savedSearch.id,
      newValues: {
        title: dto.title,
        city: dto.city,
        state: dto.state,
      },
    });

    return savedSearch;
  }

  async getSavedSearches(userId: string) {
    const list = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      count: list.length,
      data: list,
    };
  }

  async deleteSavedSearch(userId: string, searchId: string) {
    const existing = await this.prisma.savedSearch.findFirst({
      where: { id: searchId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Saved search not found');
    }

    await this.prisma.savedSearch.delete({
      where: { id: searchId },
    });

    return { message: 'Saved search deleted successfully' };
  }

  async getSavedSearchMatches(
    userId: string,
    searchId: string,
    limit = 10,
  ) {
    const savedSearch = await this.prisma.savedSearch.findFirst({
      where: { id: searchId, userId },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    // Build dynamic Prisma query filter matching the saved search criteria
    const where: any = {
      deletedAt: null,
    };

    if (savedSearch.propertyType) {
      where.propertyType = savedSearch.propertyType;
    }

    if (savedSearch.city) {
      where.city = { contains: savedSearch.city, mode: 'insensitive' };
    }

    if (savedSearch.state) {
      where.state = { contains: savedSearch.state, mode: 'insensitive' };
    }

    if (savedSearch.bedrooms) {
      where.bedrooms = { gte: savedSearch.bedrooms };
    }

    if (savedSearch.bathrooms) {
      where.bathrooms = { gte: savedSearch.bathrooms };
    }

    const listingConditions: any = {
      status: 'PUBLISHED',
    };

    if (savedSearch.listingType) {
      listingConditions.listingType = savedSearch.listingType;
    }

    if (savedSearch.minPrice || savedSearch.maxPrice) {
      listingConditions.price = {};
      if (savedSearch.minPrice) {
        listingConditions.price.gte = savedSearch.minPrice;
      }
      if (savedSearch.maxPrice) {
        listingConditions.price.lte = savedSearch.maxPrice;
      }
    }

    where.listings = {
      some: listingConditions,
    };

    const [totalMatches, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        take: Math.max(1, Math.min(50, Number(limit) || 10)),
        orderBy: { createdAt: 'desc' },
        include: {
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, thumbnailUrl: true },
          },
          listings: {
            where: { status: 'PUBLISHED' },
            take: 1,
            select: {
              id: true,
              price: true,
              currency: true,
              listingType: true,
              status: true,
            },
          },
          verification: {
            select: {
              status: true,
              riskLevel: true,
              completedAt: true,
            },
          },
        },
      }),
    ]);

    return {
      savedSearch: {
        id: savedSearch.id,
        title: savedSearch.title,
        criteria: {
          propertyType: savedSearch.propertyType,
          listingType: savedSearch.listingType,
          city: savedSearch.city,
          state: savedSearch.state,
          minPrice: savedSearch.minPrice,
          maxPrice: savedSearch.maxPrice,
          bedrooms: savedSearch.bedrooms,
          bathrooms: savedSearch.bathrooms,
        },
      },
      totalMatches,
      data: properties.map((p) => ({
        id: p.id,
        propertyCode: p.propertyCode,
        title: p.title,
        propertyType: p.propertyType,
        address: p.address,
        city: p.city,
        state: p.state,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        primaryMedia: p.media[0] || null,
        activeListing: p.listings[0] || null,
        verification: p.verification || null,
      })),
    };
  }

  // ==========================================
  // ACCOUNT SETTINGS & DEACTIVATION
  // ==========================================

  async deactivateAccount(userId: string, dto: DeactivateAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect password provided');
    }

    // In transaction: update user status to DEACTIVATED and revoke all active refresh tokens
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'DEACTIVATED',
          deletedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    await this.auditService.log({
      userId,
      action: 'USER_ACCOUNT_DEACTIVATED',
      entityType: 'User',
      entityId: userId,
      newValues: {
        status: 'DEACTIVATED',
        reason: dto.reason || null,
      },
    });

    return {
      message:
        'Your account has been deactivated successfully and all active sessions have been terminated. We hope to see you again.',
    };
  }
}
