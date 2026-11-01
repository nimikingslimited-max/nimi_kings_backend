import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { FavoriteQueryDto } from './dto/favorite-query.dto.js';

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
}
