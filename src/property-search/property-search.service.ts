import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AdvancedSearchDto } from './dto/advanced-search.dto.js';
import { NearbySearchDto } from './dto/nearby-search.dto.js';
import { MapBoundsDto } from './dto/map-bounds.dto.js';

@Injectable()
export class PropertySearchService {
  constructor(private readonly prisma: PrismaService) {}

  async advancedSearch(dto: AdvancedSearchDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;
    const skip = (page - 1) * limit;

    const andConditions: Prisma.PropertyWhereInput[] = [{ deletedAt: null }];

    if (dto.q) {
      andConditions.push({
        OR: [
          { title: { contains: dto.q, mode: 'insensitive' } },
          { description: { contains: dto.q, mode: 'insensitive' } },
          { address: { contains: dto.q, mode: 'insensitive' } },
          { city: { contains: dto.q, mode: 'insensitive' } },
          { state: { contains: dto.q, mode: 'insensitive' } },
          { propertyCode: { contains: dto.q, mode: 'insensitive' } },
        ],
      });
    }

    if (dto.propertyType) {
      andConditions.push({ propertyType: dto.propertyType });
    }

    if (dto.state) {
      andConditions.push({
        state: { equals: dto.state, mode: 'insensitive' },
      });
    }

    if (dto.city) {
      andConditions.push({
        city: { contains: dto.city, mode: 'insensitive' },
      });
    }

    if (dto.minBedrooms !== undefined) {
      andConditions.push({ bedrooms: { gte: dto.minBedrooms } });
    }

    if (dto.minBathrooms !== undefined) {
      andConditions.push({ bathrooms: { gte: dto.minBathrooms } });
    }

    if (dto.minLandSize !== undefined || dto.maxLandSize !== undefined) {
      andConditions.push({
        landSize: {
          ...(dto.minLandSize !== undefined
            ? { gte: new Prisma.Decimal(dto.minLandSize) }
            : {}),
          ...(dto.maxLandSize !== undefined
            ? { lte: new Prisma.Decimal(dto.maxLandSize) }
            : {}),
        },
      });
    }

    if (dto.verifiedOnly) {
      andConditions.push({
        verification: { status: 'VERIFIED' },
      });
    }

    // Listing-level filters
    if (
      dto.listingType !== undefined ||
      dto.minPrice !== undefined ||
      dto.maxPrice !== undefined ||
      dto.paymentPlanAvailable !== undefined
    ) {
      const listingFilter: Prisma.PropertyListingWhereInput = {};

      if (dto.listingType) {
        listingFilter.listingType = dto.listingType;
      }

      if (dto.paymentPlanAvailable !== undefined) {
        listingFilter.paymentPlanAvailable = dto.paymentPlanAvailable;
      }

      if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
        listingFilter.price = {
          ...(dto.minPrice !== undefined
            ? { gte: new Prisma.Decimal(dto.minPrice) }
            : {}),
          ...(dto.maxPrice !== undefined
            ? { lte: new Prisma.Decimal(dto.maxPrice) }
            : {}),
        };
      }

      andConditions.push({
        listings: { some: listingFilter },
      });
    }

    // Feature / Amenity filters (comma-separated)
    if (dto.features) {
      const featureList = dto.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      for (const featName of featureList) {
        andConditions.push({
          features: {
            some: {
              feature: {
                name: { equals: featName, mode: 'insensitive' },
              },
            },
          },
        });
      }
    }

    const where: Prisma.PropertyWhereInput = { AND: andConditions };

    let orderBy: Prisma.PropertyOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (dto.sortBy === 'land_size_desc') {
      orderBy = { landSize: 'desc' };
    }

    const [total, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          listings: {
            orderBy: { price: 'asc' },
          },
          media: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          features: {
            include: { feature: true },
          },
          verification: {
            select: {
              verificationCode: true,
              status: true,
              riskLevel: true,
              completedAt: true,
            },
          },
        },
      }),
    ]);

    // If sorting by price_asc or price_desc, sort by lowest active listing price
    let sortedData = properties;
    if (dto.sortBy === 'price_asc' || dto.sortBy === 'price_desc') {
      sortedData = [...properties].sort((a, b) => {
        const priceA = a.listings[0] ? Number(a.listings[0].price) : Infinity;
        const priceB = b.listings[0] ? Number(b.listings[0].price) : Infinity;
        return dto.sortBy === 'price_asc' ? priceA - priceB : priceB - priceA;
      });
    }

    return {
      data: sortedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchNearby(dto: NearbySearchDto) {
    const radiusKm = dto.radiusKm ?? 15;
    const limit = dto.limit ?? 20;

    // Bounding-box degree deltas for fast SQL index pre-filtering
    const latDelta = radiusKm / 111.0;
    const lngDelta =
      radiusKm / (111.0 * Math.cos((dto.latitude * Math.PI) / 180));

    const minLat = dto.latitude - latDelta;
    const maxLat = dto.latitude + latDelta;
    const minLng = dto.longitude - lngDelta;
    const maxLng = dto.longitude + lngDelta;

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      latitude: {
        not: null,
        gte: new Prisma.Decimal(minLat),
        lte: new Prisma.Decimal(maxLat),
      },
      longitude: {
        not: null,
        gte: new Prisma.Decimal(minLng),
        lte: new Prisma.Decimal(maxLng),
      },
      ...(dto.propertyType ? { propertyType: dto.propertyType } : {}),
      ...(dto.verifiedOnly
        ? { verification: { status: 'VERIFIED' } }
        : {}),
      ...(dto.listingType
        ? { listings: { some: { listingType: dto.listingType } } }
        : {}),
    };

    const candidates = await this.prisma.property.findMany({
      where,
      include: {
        listings: {
          orderBy: { price: 'asc' },
        },
        media: {
          where: { isPrimary: true },
          take: 1,
        },
        verification: {
          select: {
            verificationCode: true,
            status: true,
            riskLevel: true,
          },
        },
      },
    });

    // Compute exact spherical Haversine distance in km
    const resultsWithDistance = candidates
      .map((prop) => {
        const propLat = Number(prop.latitude);
        const propLng = Number(prop.longitude);
        const distanceKm = this.calculateHaversineKm(
          dto.latitude,
          dto.longitude,
          propLat,
          propLng,
        );

        return {
          ...prop,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return {
      center: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusKm,
      },
      count: resultsWithDistance.length,
      data: resultsWithDistance,
    };
  }

  async searchByMapBounds(dto: MapBoundsDto) {
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      latitude: {
        not: null,
        gte: new Prisma.Decimal(dto.southWestLat),
        lte: new Prisma.Decimal(dto.northEastLat),
      },
      longitude: {
        not: null,
        gte: new Prisma.Decimal(dto.southWestLng),
        lte: new Prisma.Decimal(dto.northEastLng),
      },
      ...(dto.propertyType ? { propertyType: dto.propertyType } : {}),
      ...(dto.verifiedOnly
        ? { verification: { status: 'VERIFIED' } }
        : {}),
      ...(dto.listingType
        ? { listings: { some: { listingType: dto.listingType } } }
        : {}),
    };

    const properties = await this.prisma.property.findMany({
      where,
      take: 150,
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
        landSize: true,
        landSizeUnit: true,
        bedrooms: true,
        bathrooms: true,
        listings: {
          orderBy: { price: 'asc' },
          take: 1,
          select: {
            id: true,
            listingType: true,
            price: true,
            currency: true,
            status: true,
          },
        },
        media: {
          where: { isPrimary: true },
          take: 1,
          select: {
            url: true,
            thumbnailUrl: true,
          },
        },
        verification: {
          select: {
            status: true,
            riskLevel: true,
          },
        },
      },
    });

    return {
      bounds: {
        northEast: { lat: dto.northEastLat, lng: dto.northEastLng },
        southWest: { lat: dto.southWestLat, lng: dto.southWestLng },
      },
      count: properties.length,
      data: properties,
    };
  }

  async getLocationAggregations() {
    const [byState, byCity, byPropertyType, verifiedCount] = await Promise.all([
      this.prisma.property.groupBy({
        by: ['state'],
        where: { deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.property.groupBy({
        by: ['city', 'state'],
        where: { deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.property.groupBy({
        by: ['propertyType'],
        where: { deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.property.count({
        where: {
          deletedAt: null,
          verification: { status: 'VERIFIED' },
        },
      }),
    ]);

    return {
      states: byState.map((s) => ({
        state: s.state,
        count: s._count.id,
      })),
      cities: byCity.map((c) => ({
        city: c.city,
        state: c.state,
        count: c._count.id,
      })),
      propertyTypes: byPropertyType.map((pt) => ({
        propertyType: pt.propertyType,
        count: pt._count.id,
      })),
      verifiedPropertiesCount: verifiedCount,
    };
  }

  private calculateHaversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
