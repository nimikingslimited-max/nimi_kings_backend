import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';
import { PropertyQueryDto } from './dto/property-query.dto.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { AddPropertyMediaDto } from './dto/add-property-media.dto.js';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePropertyDto, userId: string) {
    const propertyCode = `NK-PROP-${Math.floor(100000 + Math.random() * 900000)}`;
    const verificationCode = `NK-VRF-${Math.floor(100000 + Math.random() * 900000)}`;

    const createdId = await this.prisma.$transaction(async (tx) => {
      // 1. Create property record
      const property = await tx.property.create({
        data: {
          propertyCode,
          title: dto.title,
          description: dto.description,
          propertyType: dto.propertyType,
          landSize: dto.landSize !== undefined ? new Prisma.Decimal(dto.landSize) : null,
          landSizeUnit: dto.landSizeUnit ?? 'sqm',
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          parkingSpaces: dto.parkingSpaces,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country ?? 'Nigeria',
          latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : null,
          longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : null,
          createdById: userId,
          verification: {
            create: {
              verificationCode,
              status: 'NOT_SUBMITTED',
              riskLevel: 'LOW',
            },
          },
        },
      });

      // 2. Associate features if provided
      if (dto.featureNames && dto.featureNames.length > 0) {
        for (const featureName of dto.featureNames) {
          const feature = await tx.feature.upsert({
            where: { name: featureName.trim() },
            update: {},
            create: { name: featureName.trim() },
          });

          await tx.propertyFeature.create({
            data: {
              propertyId: property.id,
              featureId: feature.id,
            },
          });
        }
      }

      return property.id;
    });

    return this.findOne(createdId);
  }

  async findAll(query: PropertyQueryDto, currentUser?: any) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
    };

    // Text search on title, address, city, state
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { state: { contains: query.search, mode: 'insensitive' } },
        { propertyCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.propertyType) {
      where.propertyType = query.propertyType;
    }

    if (query.state) {
      where.state = { contains: query.state, mode: 'insensitive' };
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.bedrooms !== undefined) {
      where.bedrooms = query.bedrooms;
    }

    // Filter by commercial listings
    const listingWhere: Prisma.PropertyListingWhereInput = {};

    const isStaff =
      currentUser?.roles?.includes('ADMIN') ||
      currentUser?.roles?.includes('SUPER_ADMIN') ||
      currentUser?.roles?.includes('PROPERTY_MANAGER');

    if (query.status) {
      listingWhere.status = query.status;
    } else if (!isStaff) {
      // Public / Customer users only see PUBLISHED listings by default
      listingWhere.status = 'PUBLISHED';
    }

    if (query.listingType) {
      listingWhere.listingType = query.listingType;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      listingWhere.price = {};
      if (query.minPrice !== undefined) {
        listingWhere.price.gte = new Prisma.Decimal(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        listingWhere.price.lte = new Prisma.Decimal(query.maxPrice);
      }
    }

    if (Object.keys(listingWhere).length > 0) {
      where.listings = {
        some: listingWhere,
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
          listings: true,
          media: {
            orderBy: { sortOrder: 'asc' },
          },
          features: {
            include: {
              feature: true,
            },
          },
          verification: {
            select: {
              status: true,
              riskLevel: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      data: properties,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrCode: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        OR: [{ id: idOrCode }, { propertyCode: idOrCode }],
        deletedAt: null,
      },
      include: {
        listings: {
          orderBy: { createdAt: 'desc' },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        features: {
          include: {
            feature: true,
          },
        },
        verification: true,
        documents: {
          select: {
            id: true,
            documentType: true,
            status: true,
            documentNumber: true,
            verifiedAt: true,
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
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${idOrCode}' not found`);
    }

    return property;
  }

  async update(id: string, dto: UpdatePropertyDto, currentUser: any) {
    const existing = await this.findOne(id);

    const isStaff =
      currentUser.roles?.includes('ADMIN') ||
      currentUser.roles?.includes('SUPER_ADMIN') ||
      currentUser.roles?.includes('PROPERTY_MANAGER');

    if (!isStaff && existing.createdById !== currentUser.id) {
      throw new ForbiddenException(
        'You are not authorized to update this property',
      );
    }

    const updatedId = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id: existing.id },
        data: {
          title: dto.title,
          description: dto.description,
          propertyType: dto.propertyType,
          landSize: dto.landSize !== undefined ? new Prisma.Decimal(dto.landSize) : undefined,
          landSizeUnit: dto.landSizeUnit,
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          parkingSpaces: dto.parkingSpaces,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : undefined,
          longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : undefined,
        },
      });

      if (dto.featureNames) {
        // Clear existing features and re-attach
        await tx.propertyFeature.deleteMany({
          where: { propertyId: existing.id },
        });

        for (const featureName of dto.featureNames) {
          const feature = await tx.feature.upsert({
            where: { name: featureName.trim() },
            update: {},
            create: { name: featureName.trim() },
          });

          await tx.propertyFeature.create({
            data: {
              propertyId: existing.id,
              featureId: feature.id,
            },
          });
        }
      }

      return updated.id;
    });

    return this.findOne(updatedId);
  }

  async remove(id: string, currentUser: any) {
    const existing = await this.findOne(id);

    const isStaff =
      currentUser.roles?.includes('ADMIN') ||
      currentUser.roles?.includes('SUPER_ADMIN') ||
      currentUser.roles?.includes('PROPERTY_MANAGER');

    if (!isStaff && existing.createdById !== currentUser.id) {
      throw new ForbiddenException(
        'You are not authorized to delete this property',
      );
    }

    await this.prisma.property.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return { message: `Property '${existing.propertyCode}' soft-deleted successfully` };
  }

  // ==========================================
  // LISTINGS
  // ==========================================

  async createListing(propertyId: string, dto: CreateListingDto, userId: string) {
    const property = await this.findOne(propertyId);

    const listing = await this.prisma.propertyListing.create({
      data: {
        propertyId: property.id,
        listingType: dto.listingType,
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency ?? 'NGN',
        paymentPlanAvailable: dto.paymentPlanAvailable ?? false,
        status: dto.status ?? 'DRAFT',
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
        createdById: userId,
      },
    });

    return listing;
  }

  async updateListing(
    propertyId: string,
    listingId: string,
    dto: UpdateListingDto,
  ) {
    const listing = await this.prisma.propertyListing.findFirst({
      where: { id: listingId, propertyId },
    });

    if (!listing) {
      throw new NotFoundException(`Listing '${listingId}' not found on this property`);
    }

    return this.prisma.propertyListing.update({
      where: { id: listingId },
      data: {
        listingType: dto.listingType,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        currency: dto.currency,
        paymentPlanAvailable: dto.paymentPlanAvailable,
        status: dto.status,
        publishedAt:
          dto.status === 'PUBLISHED' && !listing.publishedAt
            ? new Date()
            : undefined,
      },
    });
  }

  // ==========================================
  // MEDIA
  // ==========================================

  async addMedia(propertyId: string, dto: AddPropertyMediaDto) {
    const property = await this.findOne(propertyId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.propertyMedia.updateMany({
          where: { propertyId: property.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const media = await tx.propertyMedia.create({
        data: {
          propertyId: property.id,
          type: dto.type,
          url: dto.url,
          storageKey: dto.storageKey,
          thumbnailUrl: dto.thumbnailUrl,
          sortOrder: dto.sortOrder ?? 0,
          isPrimary: dto.isPrimary ?? false,
        },
      });

      return media;
    });
  }

  async removeMedia(propertyId: string, mediaId: string) {
    const media = await this.prisma.propertyMedia.findFirst({
      where: { id: mediaId, propertyId },
    });

    if (!media) {
      throw new NotFoundException(`Media '${mediaId}' not found on this property`);
    }

    await this.prisma.propertyMedia.delete({
      where: { id: mediaId },
    });

    return { message: 'Media removed successfully' };
  }

  // ==========================================
  // FEATURES
  // ==========================================

  async assignFeatures(propertyId: string, featureNames: string[]) {
    const property = await this.findOne(propertyId);

    await this.prisma.$transaction(async (tx) => {
      for (const name of featureNames) {
        const feature = await tx.feature.upsert({
          where: { name: name.trim() },
          update: {},
          create: { name: name.trim() },
        });

        await tx.propertyFeature.upsert({
          where: {
            propertyId_featureId: {
              propertyId: property.id,
              featureId: feature.id,
            },
          },
          update: {},
          create: {
            propertyId: property.id,
            featureId: feature.id,
          },
        });
      }
    });

    return this.findOne(property.id);
  }

  async getAllFeatures() {
    return this.prisma.feature.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
