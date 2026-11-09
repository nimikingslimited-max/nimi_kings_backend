import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateFarmDto } from './dto/create-farm.dto.js';
import { UpdateFarmDto } from './dto/update-farm.dto.js';
import { FarmQueryDto } from './dto/farm-query.dto.js';
import { CreateCropCycleDto } from './dto/create-crop-cycle.dto.js';
import { UpdateCropCycleDto } from './dto/update-crop-cycle.dto.js';
import { CropCycleQueryDto } from './dto/crop-cycle-query.dto.js';

@Injectable()
export class AgricultureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}


  private generateCycleCode(): string {
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'NK-CC-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateFarmCode(): string {
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'NK-FARM-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ==========================================
  // FEATURE 1: FARMS & AGRICULTURAL ESTATES
  // ==========================================

  /**
   * Register a new farm estate or agricultural facility.
   */
  async createFarm(dto: CreateFarmDto, creatorId: string) {
    if (dto.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, deletedAt: null },
      });
      if (!property) {
        throw new NotFoundException(`Property with ID '${dto.propertyId}' not found`);
      }
    }

    if (dto.farmManagerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: dto.farmManagerId },
      });
      if (!manager || manager.status !== 'ACTIVE') {
        throw new BadRequestException('Farm Manager must be an active registered user');
      }
    }

    let farmCode = this.generateFarmCode();
    let collision = await this.prisma.farm.findUnique({ where: { farmCode } });
    while (collision) {
      farmCode = this.generateFarmCode();
      collision = await this.prisma.farm.findUnique({ where: { farmCode } });
    }

    const farm = await this.prisma.farm.create({
      data: {
        farmCode,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        propertyId: dto.propertyId,
        farmManagerId: dto.farmManagerId,
        status: dto.status || 'ACTIVE',
        totalArea: dto.totalArea,
        areaUnit: dto.areaUnit || 'HECTARES',
        soilType: dto.soilType?.trim(),
        irrigationSource: dto.irrigationSource?.trim(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        country: dto.country?.trim() || 'Nigeria',
        latitude: dto.latitude,
        longitude: dto.longitude,
        budget: dto.budget,
      },
      include: {
        property: {
          select: { id: true, title: true, propertyCode: true },
        },
        farmManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await this.auditService.log({
      userId: creatorId,
      action: 'FARM_CREATED',
      entityType: 'Farm',
      entityId: farm.id,
      newValues: {
        farmCode: farm.farmCode,
        name: farm.name,
        totalArea: farm.totalArea,
        areaUnit: farm.areaUnit,
        status: farm.status,
      },
    });

    return {
      message: 'Agricultural farm estate registered successfully',
      farm: {
        id: farm.id,
        farmCode: farm.farmCode,
        name: farm.name,
        description: farm.description,
        status: farm.status,
        totalArea: Number(farm.totalArea),
        areaUnit: farm.areaUnit,
        soilType: farm.soilType,
        irrigationSource: farm.irrigationSource,
        location: {
          address: farm.address,
          city: farm.city,
          state: farm.state,
          country: farm.country,
          latitude: farm.latitude ? Number(farm.latitude) : null,
          longitude: farm.longitude ? Number(farm.longitude) : null,
        },
        budget: farm.budget ? Number(farm.budget) : null,
        property: farm.property,
        farmManager: farm.farmManager,
        createdAt: farm.createdAt,
      },
    };
  }

  /**
   * List and filter farms with pagination and search.
   */
  async getFarms(query: FarmQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.FarmWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.state) {
      where.state = { contains: query.state.trim(), mode: 'insensitive' };
    }

    if (query.city) {
      where.city = { contains: query.city.trim(), mode: 'insensitive' };
    }

    if (query.minArea !== undefined || query.maxArea !== undefined) {
      where.totalArea = {};
      if (query.minArea !== undefined) where.totalArea.gte = query.minArea;
      if (query.maxArea !== undefined) where.totalArea.lte = query.maxArea;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { farmCode: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [farms, total] = await Promise.all([
      this.prisma.farm.findMany({
        where,
        include: {
          farmManager: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          property: {
            select: { id: true, propertyCode: true, title: true },
          },
          cropCycles: {
            select: {
              id: true,
              cropName: true,
              stage: true,
              allocatedArea: true,
            },
          },
          _count: {
            select: {
              cropCycles: true,
              expenses: true,
              revenues: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.farm.count({ where }),
    ]);

    const formatted = farms.map((f) => {
      const activeCycles = f.cropCycles.filter(
        (c) => !['COMPLETED', 'CANCELLED'].includes(c.stage),
      );
      const allocatedHectares = activeCycles.reduce(
        (acc, c) => acc + Number(c.allocatedArea),
        0,
      );

      return {
        id: f.id,
        farmCode: f.farmCode,
        name: f.name,
        description: f.description,
        status: f.status,
        totalArea: Number(f.totalArea),
        areaUnit: f.areaUnit,
        soilType: f.soilType,
        irrigationSource: f.irrigationSource,
        location: {
          address: f.address,
          city: f.city,
          state: f.state,
          country: f.country,
        },
        budget: f.budget ? Number(f.budget) : null,
        property: f.property,
        farmManager: f.farmManager,
        activeCyclesCount: activeCycles.length,
        totalCyclesCount: f._count.cropCycles,
        allocatedArea: Number(allocatedHectares.toFixed(2)),
        remainingArea: Math.max(0, Number((Number(f.totalArea) - allocatedHectares).toFixed(2))),
        createdAt: f.createdAt,
      };
    });

    return {
      farms: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Detailed dossier of a single farm asset including crop cycles and financial summary.
   */
  async getFarmById(id: string) {
    const farm = await this.prisma.farm.findUnique({
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
        farmManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        cropCycles: {
          include: {
            harvests: { select: { quantity: true, unit: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 5,
          include: {
            recordedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        revenues: {
          orderBy: { saleDate: 'desc' },
          take: 5,
          include: {
            recordedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID '${id}' not found`);
    }

    const [aggExpenses, aggRevenues] = await Promise.all([
      this.prisma.farmExpense.aggregate({
        where: { farmId: id },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.farmRevenue.aggregate({
        where: { farmId: id },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const activeCycles = farm.cropCycles.filter(
      (c) => !['COMPLETED', 'CANCELLED'].includes(c.stage),
    );
    const allocatedArea = activeCycles.reduce(
      (sum, c) => sum + Number(c.allocatedArea),
      0,
    );
    const totalArea = Number(farm.totalArea);
    const remainingArea = Math.max(0, totalArea - allocatedArea);

    const totalSpent = Number(aggExpenses._sum.amount || 0);
    const totalRevenue = Number(aggRevenues._sum.totalAmount || 0);
    const netProfit = totalRevenue - totalSpent;

    return {
      farm: {
        id: farm.id,
        farmCode: farm.farmCode,
        name: farm.name,
        description: farm.description,
        status: farm.status,
        totalArea,
        areaUnit: farm.areaUnit,
        soilType: farm.soilType,
        irrigationSource: farm.irrigationSource,
        location: {
          address: farm.address,
          city: farm.city,
          state: farm.state,
          country: farm.country,
          latitude: farm.latitude ? Number(farm.latitude) : null,
          longitude: farm.longitude ? Number(farm.longitude) : null,
        },
        budget: farm.budget ? Number(farm.budget) : null,
        property: farm.property,
        farmManager: farm.farmManager,
        createdAt: farm.createdAt,
        updatedAt: farm.updatedAt,
      },
      landUtilization: {
        totalArea,
        allocatedArea: Number(allocatedArea.toFixed(2)),
        remainingArea: Number(remainingArea.toFixed(2)),
        utilizationPercentage:
          totalArea > 0 ? Number(((allocatedArea / totalArea) * 100).toFixed(2)) : 0,
      },
      financialSummary: {
        totalExpenses: totalSpent,
        totalRevenues: totalRevenue,
        netProfit,
        isProfitable: netProfit >= 0,
        expenseTransactionsCount: aggExpenses._count.id,
        revenueTransactionsCount: aggRevenues._count.id,
      },
      cropCycles: farm.cropCycles.map((c) => ({
        id: c.id,
        cycleCode: c.cycleCode,
        cropName: c.cropName,
        variety: c.variety,
        stage: c.stage,
        allocatedArea: Number(c.allocatedArea),
        areaUnit: c.areaUnit,
        startDate: c.startDate,
        expectedHarvestDate: c.expectedHarvestDate,
        actualHarvestDate: c.actualHarvestDate,
        targetYield: c.targetYield ? Number(c.targetYield) : null,
        yieldUnit: c.yieldUnit,
        harvestsCount: c.harvests.length,
      })),
      recentExpenses: farm.expenses.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        currency: e.currency,
        expenseDate: e.expenseDate,
        recordedBy: e.recordedBy,
      })),
      recentRevenues: farm.revenues.map((r) => ({
        id: r.id,
        buyerName: r.buyerName,
        produceSold: r.produceSold,
        quantity: Number(r.quantity),
        unit: r.unit,
        unitPrice: Number(r.unitPrice),
        totalAmount: Number(r.totalAmount),
        currency: r.currency,
        saleDate: r.saleDate,
        recordedBy: r.recordedBy,
      })),
    };
  }

  /**
   * Update parameters of an existing farm.
   */
  async updateFarm(id: string, dto: UpdateFarmDto, editorId: string) {
    const existing = await this.prisma.farm.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Farm with ID '${id}' not found`);
    }

    if (dto.propertyId && dto.propertyId !== existing.propertyId) {
      const prop = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, deletedAt: null },
      });
      if (!prop) {
        throw new NotFoundException(`Property with ID '${dto.propertyId}' not found`);
      }
    }

    if (dto.farmManagerId && dto.farmManagerId !== existing.farmManagerId) {
      const mgr = await this.prisma.user.findUnique({
        where: { id: dto.farmManagerId },
      });
      if (!mgr || mgr.status !== 'ACTIVE') {
        throw new BadRequestException('Farm Manager must be an active registered user');
      }
    }

    const updated = await this.prisma.farm.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        propertyId: dto.propertyId !== undefined ? dto.propertyId : undefined,
        farmManagerId: dto.farmManagerId !== undefined ? dto.farmManagerId : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        totalArea: dto.totalArea !== undefined ? dto.totalArea : undefined,
        areaUnit: dto.areaUnit !== undefined ? dto.areaUnit : undefined,
        soilType: dto.soilType !== undefined ? dto.soilType.trim() : undefined,
        irrigationSource:
          dto.irrigationSource !== undefined ? dto.irrigationSource.trim() : undefined,
        address: dto.address !== undefined ? dto.address.trim() : undefined,
        city: dto.city !== undefined ? dto.city.trim() : undefined,
        state: dto.state !== undefined ? dto.state.trim() : undefined,
        country: dto.country !== undefined ? dto.country.trim() : undefined,
        latitude: dto.latitude !== undefined ? dto.latitude : undefined,
        longitude: dto.longitude !== undefined ? dto.longitude : undefined,
        budget: dto.budget !== undefined ? dto.budget : undefined,
      },
      include: {
        property: {
          select: { id: true, title: true, propertyCode: true },
        },
        farmManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await this.auditService.log({
      userId: editorId,
      action: 'FARM_UPDATED',
      entityType: 'Farm',
      entityId: id,
      oldValues: {
        name: existing.name,
        status: existing.status,
        totalArea: existing.totalArea,
      },
      newValues: {
        name: updated.name,
        status: updated.status,
        totalArea: updated.totalArea,
      },
    });

    return {
      message: 'Farm estate amended successfully',
      farm: {
        id: updated.id,
        farmCode: updated.farmCode,
        name: updated.name,
        description: updated.description,
        status: updated.status,
        totalArea: Number(updated.totalArea),
        areaUnit: updated.areaUnit,
        soilType: updated.soilType,
        irrigationSource: updated.irrigationSource,
        location: {
          address: updated.address,
          city: updated.city,
          state: updated.state,
          country: updated.country,
        },
        budget: updated.budget ? Number(updated.budget) : null,
        property: updated.property,
        farmManager: updated.farmManager,
        updatedAt: updated.updatedAt,
      },
    };
  }

  /**
   * Delete a farm estate and all its child crop cycles, field logs, expenses, and revenues.
   */
  async deleteFarm(id: string, deleterId: string) {
    const existing = await this.prisma.farm.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Farm with ID '${id}' not found`);
    }

    await this.prisma.farm.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: deleterId,
      action: 'FARM_DELETED',
      entityType: 'Farm',
      entityId: id,
      oldValues: {
        farmCode: existing.farmCode,
        name: existing.name,
        totalArea: existing.totalArea,
      },
    });

    return {
      message: `Farm '${existing.name}' (${existing.farmCode}) deleted successfully`,
      id,
    };
  }

  // ==========================================
  // FEATURE 2: CROP CYCLES & CULTIVATION PHASES
  // ==========================================

  /**
   * Initiate a new crop cultivation cycle on a farm estate with area allocation guard.
   */
  async createCropCycle(
    farmId: string,
    dto: CreateCropCycleDto,
    creatorId: string,
  ) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        id: true,
        farmCode: true,
        name: true,
        totalArea: true,
        areaUnit: true,
      },
    });

    if (!farm) {
      throw new NotFoundException(`Farm estate with ID '${farmId}' not found`);
    }

    // Capacity Guard: verify allocatedArea does not exceed remaining unallocated land
    const activeCycles = await this.prisma.cropCycle.findMany({
      where: {
        farmId,
        stage: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: { allocatedArea: true },
    });

    const currentAllocated = activeCycles.reduce(
      (sum, c) => sum + Number(c.allocatedArea),
      0,
    );
    const totalFarmArea = Number(farm.totalArea);
    const remainingArea = Math.max(0, totalFarmArea - currentAllocated);

    if (currentAllocated + dto.allocatedArea > totalFarmArea) {
      throw new BadRequestException(
        `Cannot allocate ${dto.allocatedArea} ${dto.areaUnit || farm.areaUnit}. Total farm area is ${totalFarmArea}, with ${currentAllocated.toFixed(2)} already allocated across active crop cycles (remaining available: ${remainingArea.toFixed(2)}).`,
      );
    }

    let cycleCode = this.generateCycleCode();
    let collision = await this.prisma.cropCycle.findUnique({ where: { cycleCode } });
    while (collision) {
      cycleCode = this.generateCycleCode();
      collision = await this.prisma.cropCycle.findUnique({ where: { cycleCode } });
    }

    const cycle = await this.prisma.cropCycle.create({
      data: {
        cycleCode,
        farmId,
        cropName: dto.cropName.trim(),
        variety: dto.variety?.trim(),
        stage: dto.stage || 'PLANNED',
        allocatedArea: dto.allocatedArea,
        areaUnit: dto.areaUnit || farm.areaUnit,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expectedHarvestDate: dto.expectedHarvestDate
          ? new Date(dto.expectedHarvestDate)
          : undefined,
        targetYield: dto.targetYield,
        yieldUnit: dto.yieldUnit || 'KG',
        estimatedBudget: dto.estimatedBudget,
      },
      include: {
        farm: {
          select: { id: true, farmCode: true, name: true },
        },
      },
    });

    await this.auditService.log({
      userId: creatorId,
      action: 'CROP_CYCLE_CREATED',
      entityType: 'CropCycle',
      entityId: cycle.id,
      newValues: {
        farmId,
        cycleCode: cycle.cycleCode,
        cropName: cycle.cropName,
        stage: cycle.stage,
        allocatedArea: cycle.allocatedArea,
      },
    });

    const updatedRemainingArea = Math.max(
      0,
      totalFarmArea - (currentAllocated + dto.allocatedArea),
    );

    return {
      message: 'Crop cultivation cycle initiated successfully',
      cropCycle: {
        id: cycle.id,
        cycleCode: cycle.cycleCode,
        cropName: cycle.cropName,
        variety: cycle.variety,
        stage: cycle.stage,
        allocatedArea: Number(cycle.allocatedArea),
        areaUnit: cycle.areaUnit,
        startDate: cycle.startDate,
        expectedHarvestDate: cycle.expectedHarvestDate,
        targetYield: cycle.targetYield ? Number(cycle.targetYield) : null,
        yieldUnit: cycle.yieldUnit,
        estimatedBudget: cycle.estimatedBudget ? Number(cycle.estimatedBudget) : null,
        farm: cycle.farm,
        createdAt: cycle.createdAt,
      },
      farmLandUtilization: {
        totalFarmArea,
        allocatedArea: Number((currentAllocated + dto.allocatedArea).toFixed(2)),
        remainingArea: Number(updatedRemainingArea.toFixed(2)),
      },
    };
  }

  /**
   * List crop cycles for a specific farm with optional stage and cropName filters.
   */
  async getFarmCropCycles(farmId: string, query: CropCycleQueryDto) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { id: true, name: true, farmCode: true, totalArea: true, areaUnit: true },
    });

    if (!farm) {
      throw new NotFoundException(`Farm estate with ID '${farmId}' not found`);
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.CropCycleWhereInput = {
      farmId,
    };

    if (query.stage) {
      where.stage = query.stage;
    }

    if (query.cropName) {
      where.cropName = { contains: query.cropName.trim(), mode: 'insensitive' };
    }

    const [cycles, total] = await Promise.all([
      this.prisma.cropCycle.findMany({
        where,
        include: {
          fieldLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              title: true,
              stage: true,
              growthPercentage: true,
              createdAt: true,
            },
          },
          harvests: {
            select: { quantity: true, unit: true },
          },
          _count: {
            select: {
              fieldLogs: true,
              harvests: true,
              expenses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cropCycle.count({ where }),
    ]);

    const formatted = cycles.map((c) => {
      const totalHarvested = c.harvests.reduce(
        (sum, h) => sum + Number(h.quantity),
        0,
      );
      const latestLog = c.fieldLogs[0];

      return {
        id: c.id,
        cycleCode: c.cycleCode,
        cropName: c.cropName,
        variety: c.variety,
        stage: c.stage,
        allocatedArea: Number(c.allocatedArea),
        areaUnit: c.areaUnit,
        startDate: c.startDate,
        expectedHarvestDate: c.expectedHarvestDate,
        actualHarvestDate: c.actualHarvestDate,
        targetYield: c.targetYield ? Number(c.targetYield) : null,
        yieldUnit: c.yieldUnit,
        totalHarvested: Number(totalHarvested.toFixed(2)),
        fieldLogsCount: c._count.fieldLogs,
        harvestsCount: c._count.harvests,
        expensesCount: c._count.expenses,
        latestFieldLog: latestLog
          ? {
              title: latestLog.title,
              stage: latestLog.stage,
              growthPercentage: latestLog.growthPercentage
                ? Number(latestLog.growthPercentage)
                : null,
              date: latestLog.createdAt,
            }
          : null,
        createdAt: c.createdAt,
      };
    });

    return {
      farm,
      cropCycles: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Detailed dossier of a single crop cycle.
   */
  async getCropCycleById(id: string) {
    const cycle = await this.prisma.cropCycle.findUnique({
      where: { id },
      include: {
        farm: {
          select: {
            id: true,
            farmCode: true,
            name: true,
            city: true,
            state: true,
            soilType: true,
            irrigationSource: true,
            totalArea: true,
            areaUnit: true,
            farmManager: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        fieldLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            media: true,
            recordedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        harvests: {
          orderBy: { harvestDate: 'desc' },
          take: 5,
          include: {
            recordedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 5,
          include: {
            recordedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Crop cycle with ID '${id}' not found`);
    }

    const [aggHarvest, aggExpense] = await Promise.all([
      this.prisma.harvestRecord.aggregate({
        where: { cropCycleId: id },
        _sum: { quantity: true, estimatedValue: true },
        _count: { id: true },
      }),
      this.prisma.farmExpense.aggregate({
        where: { cropCycleId: id },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalHarvested = Number(aggHarvest._sum.quantity || 0);
    const targetYield = cycle.targetYield ? Number(cycle.targetYield) : null;
    const yieldAttainmentPercentage =
      targetYield && targetYield > 0
        ? Number(((totalHarvested / targetYield) * 100).toFixed(2))
        : null;

    return {
      cropCycle: {
        id: cycle.id,
        cycleCode: cycle.cycleCode,
        cropName: cycle.cropName,
        variety: cycle.variety,
        stage: cycle.stage,
        allocatedArea: Number(cycle.allocatedArea),
        areaUnit: cycle.areaUnit,
        startDate: cycle.startDate,
        expectedHarvestDate: cycle.expectedHarvestDate,
        actualHarvestDate: cycle.actualHarvestDate,
        targetYield,
        yieldUnit: cycle.yieldUnit,
        estimatedBudget: cycle.estimatedBudget
          ? Number(cycle.estimatedBudget)
          : null,
        createdAt: cycle.createdAt,
        updatedAt: cycle.updatedAt,
      },
      farm: cycle.farm,
      yieldSummary: {
        targetYield,
        totalHarvested,
        yieldAttainmentPercentage,
        estimatedTotalValue: Number(aggHarvest._sum.estimatedValue || 0),
        totalHarvestBatches: aggHarvest._count.id,
      },
      financialSnapshot: {
        estimatedBudget: cycle.estimatedBudget
          ? Number(cycle.estimatedBudget)
          : null,
        totalDirectExpenses: Number(aggExpense._sum.amount || 0),
        expenseEntriesCount: aggExpense._count.id,
      },
      recentFieldLogs: cycle.fieldLogs.map((l) => ({
        id: l.id,
        title: l.title,
        notes: l.notes,
        stage: l.stage,
        weatherCondition: l.weatherCondition,
        growthPercentage: l.growthPercentage ? Number(l.growthPercentage) : null,
        recordedBy: l.recordedBy,
        createdAt: l.createdAt,
        media: l.media.map((m) => ({ id: m.id, type: m.type, url: m.url })),
      })),
      recentHarvests: cycle.harvests.map((h) => ({
        id: h.id,
        harvestDate: h.harvestDate,
        quantity: Number(h.quantity),
        unit: h.unit,
        qualityGrade: h.qualityGrade,
        storageLocation: h.storageLocation,
        estimatedValue: h.estimatedValue ? Number(h.estimatedValue) : null,
        recordedBy: h.recordedBy,
      })),
    };
  }

  /**
   * Update crop cycle stage, allocated area, or harvest dates.
   */
  async updateCropCycle(
    id: string,
    dto: UpdateCropCycleDto,
    editorId: string,
  ) {
    const existing = await this.prisma.cropCycle.findUnique({
      where: { id },
      include: {
        farm: { select: { totalArea: true, areaUnit: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Crop cycle with ID '${id}' not found`);
    }

    // Capacity Guard if allocatedArea is being modified
    if (
      dto.allocatedArea !== undefined &&
      dto.allocatedArea !== Number(existing.allocatedArea)
    ) {
      const activeCycles = await this.prisma.cropCycle.findMany({
        where: {
          farmId: existing.farmId,
          id: { not: id },
          stage: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        select: { allocatedArea: true },
      });
      const otherAllocated = activeCycles.reduce(
        (sum, c) => sum + Number(c.allocatedArea),
        0,
      );
      const totalFarmArea = Number(existing.farm.totalArea);
      if (otherAllocated + dto.allocatedArea > totalFarmArea) {
        throw new BadRequestException(
          `Cannot increase allocation to ${dto.allocatedArea}. Other active cycles occupy ${otherAllocated.toFixed(2)} out of ${totalFarmArea} total farm area.`,
        );
      }
    }

    // Auto-set actualHarvestDate when completed
    let actualHarvestDate =
      dto.actualHarvestDate !== undefined
        ? new Date(dto.actualHarvestDate)
        : existing.actualHarvestDate;
    if (dto.stage === 'COMPLETED' && !actualHarvestDate) {
      actualHarvestDate = new Date();
    }

    const updated = await this.prisma.cropCycle.update({
      where: { id },
      data: {
        cropName: dto.cropName !== undefined ? dto.cropName.trim() : undefined,
        variety: dto.variety !== undefined ? dto.variety.trim() : undefined,
        stage: dto.stage !== undefined ? dto.stage : undefined,
        allocatedArea:
          dto.allocatedArea !== undefined ? dto.allocatedArea : undefined,
        areaUnit: dto.areaUnit !== undefined ? dto.areaUnit : undefined,
        startDate:
          dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
        expectedHarvestDate:
          dto.expectedHarvestDate !== undefined
            ? new Date(dto.expectedHarvestDate)
            : undefined,
        actualHarvestDate,
        targetYield:
          dto.targetYield !== undefined ? dto.targetYield : undefined,
        yieldUnit: dto.yieldUnit !== undefined ? dto.yieldUnit.trim() : undefined,
        estimatedBudget:
          dto.estimatedBudget !== undefined ? dto.estimatedBudget : undefined,
      },
    });

    await this.auditService.log({
      userId: editorId,
      action: 'CROP_CYCLE_UPDATED',
      entityType: 'CropCycle',
      entityId: id,
      oldValues: {
        stage: existing.stage,
        allocatedArea: existing.allocatedArea,
      },
      newValues: {
        stage: updated.stage,
        allocatedArea: updated.allocatedArea,
      },
    });

    return {
      message: 'Crop cultivation cycle amended successfully',
      cropCycle: {
        id: updated.id,
        cycleCode: updated.cycleCode,
        cropName: updated.cropName,
        variety: updated.variety,
        stage: updated.stage,
        allocatedArea: Number(updated.allocatedArea),
        areaUnit: updated.areaUnit,
        startDate: updated.startDate,
        expectedHarvestDate: updated.expectedHarvestDate,
        actualHarvestDate: updated.actualHarvestDate,
        targetYield: updated.targetYield ? Number(updated.targetYield) : null,
        yieldUnit: updated.yieldUnit,
        estimatedBudget: updated.estimatedBudget
          ? Number(updated.estimatedBudget)
          : null,
        updatedAt: updated.updatedAt,
      },
    };
  }

  /**
   * Delete a crop cycle and associated records.
   */
  async deleteCropCycle(id: string, deleterId: string) {
    const existing = await this.prisma.cropCycle.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Crop cycle with ID '${id}' not found`);
    }

    await this.prisma.cropCycle.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: deleterId,
      action: 'CROP_CYCLE_DELETED',
      entityType: 'CropCycle',
      entityId: id,
      oldValues: {
        cycleCode: existing.cycleCode,
        cropName: existing.cropName,
        farmId: existing.farmId,
      },
    });

    return {
      message: `Crop cycle '${existing.cropName}' (${existing.cycleCode}) deleted successfully`,
      id,
      farmId: existing.farmId,
    };
  }

}
