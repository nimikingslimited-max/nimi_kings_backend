import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { SubmitVerificationDto } from './dto/submit-verification.dto.js';
import { AssignOfficerDto } from './dto/assign-officer.dto.js';
import { ReviewVerificationDto } from './dto/review-verification.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { VerifyDocumentDto } from './dto/verify-document.dto.js';
import { VerificationQueryDto } from './dto/verification-query.dto.js';

@Injectable()
export class PropertyVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async submitForVerification(
    propertyId: string,
    dto: SubmitVerificationDto,
    userId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: {
        OR: [{ id: propertyId }, { propertyCode: propertyId }],
        deletedAt: null,
      },
      include: {
        verification: true,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${propertyId}' not found`);
    }

    let verification = property.verification;

    if (!verification) {
      const verificationCode = `NK-VRF-${Math.floor(100000 + Math.random() * 900000)}`;
      verification = await this.prisma.propertyVerification.create({
        data: {
          propertyId: property.id,
          verificationCode,
          status: 'PENDING',
          submittedAt: new Date(),
          remarks: dto.remarks,
        },
      });

      await this.auditService.log({
        userId,
        action: 'PROPERTY_VERIFICATION_SUBMITTED',
        entityType: 'PropertyVerification',
        entityId: verification.id,
        newValues: { status: 'PENDING', remarks: dto.remarks },
      });
    } else {
      const oldStatus = verification.status;
      verification = await this.prisma.propertyVerification.update({
        where: { id: verification.id },
        data: {
          status: 'PENDING',
          submittedAt: new Date(),
          remarks: dto.remarks ?? verification.remarks,
        },
      });

      await this.auditService.log({
        userId,
        action: 'PROPERTY_VERIFICATION_SUBMITTED',
        entityType: 'PropertyVerification',
        entityId: verification.id,
        oldValues: { status: oldStatus },
        newValues: { status: 'PENDING', remarks: dto.remarks },
      });
    }

    return this.getVerificationDossier(property.id);
  }

  async assignOfficer(
    propertyId: string,
    dto: AssignOfficerDto,
    assignerId: string,
  ) {
    const verification = await this.findVerificationByProperty(propertyId);

    const officer = await this.prisma.user.findUnique({
      where: { id: dto.officerId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!officer || officer.status !== 'ACTIVE') {
      throw new BadRequestException('Assigned officer must be an active user');
    }

    const oldOfficerId = verification.assignedToId;
    const oldStatus = verification.status;
    const newStatus =
      verification.status === 'NOT_SUBMITTED' || verification.status === 'PENDING'
        ? 'IN_PROGRESS'
        : verification.status;

    const updated = await this.prisma.propertyVerification.update({
      where: { id: verification.id },
      data: {
        assignedToId: officer.id,
        status: newStatus,
        startedAt: verification.startedAt ?? new Date(),
      },
      include: {
        assignedTo: {
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
      userId: assignerId,
      action: 'VERIFICATION_OFFICER_ASSIGNED',
      entityType: 'PropertyVerification',
      entityId: verification.id,
      oldValues: { assignedToId: oldOfficerId, status: oldStatus },
      newValues: { assignedToId: officer.id, status: newStatus },
    });

    return updated;
  }

  async reviewVerification(
    propertyId: string,
    dto: ReviewVerificationDto,
    reviewerId: string,
  ) {
    const verification = await this.findVerificationByProperty(propertyId);

    const oldValues = {
      status: verification.status,
      riskLevel: verification.riskLevel,
      remarks: verification.remarks,
    };

    const updated = await this.prisma.propertyVerification.update({
      where: { id: verification.id },
      data: {
        status: dto.status,
        riskLevel: dto.riskLevel,
        remarks: dto.remarks,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        completedAt: new Date(),
      },
      include: {
        reviewedBy: {
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
      userId: reviewerId,
      action: `PROPERTY_VERIFICATION_${dto.status}`,
      entityType: 'PropertyVerification',
      entityId: verification.id,
      oldValues,
      newValues: {
        status: dto.status,
        riskLevel: dto.riskLevel,
        remarks: dto.remarks,
      },
    });

    return updated;
  }

  async uploadDocument(
    propertyId: string,
    dto: UploadDocumentDto,
    uploaderId: string,
  ) {
    const property = await this.findProperty(propertyId);

    const document = await this.prisma.propertyDocument.create({
      data: {
        propertyId: property.id,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        fileUrl: dto.fileUrl,
        storageKey: dto.storageKey,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        remarks: dto.remarks,
        status: 'PENDING',
        uploadedById: uploaderId,
      },
    });

    await this.auditService.log({
      userId: uploaderId,
      action: 'PROPERTY_DOCUMENT_UPLOADED',
      entityType: 'PropertyDocument',
      entityId: document.id,
      newValues: {
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
      },
    });

    return document;
  }

  async verifyDocument(
    propertyId: string,
    documentId: string,
    dto: VerifyDocumentDto,
    officerId: string,
  ) {
    const property = await this.findProperty(propertyId);

    const document = await this.prisma.propertyDocument.findFirst({
      where: { id: documentId, propertyId: property.id },
    });

    if (!document) {
      throw new NotFoundException(
        `Document '${documentId}' not found on this property`,
      );
    }

    const oldStatus = document.status;

    const updated = await this.prisma.propertyDocument.update({
      where: { id: document.id },
      data: {
        status: dto.status,
        remarks: dto.remarks ?? document.remarks,
        verifiedById: officerId,
        verifiedAt: new Date(),
      },
      include: {
        verifiedBy: {
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
      userId: officerId,
      action: `PROPERTY_DOCUMENT_${dto.status}`,
      entityType: 'PropertyDocument',
      entityId: document.id,
      oldValues: { status: oldStatus },
      newValues: { status: dto.status, remarks: dto.remarks },
    });

    return updated;
  }

  async removeDocument(propertyId: string, documentId: string, userId: string) {
    const property = await this.findProperty(propertyId);

    const document = await this.prisma.propertyDocument.findFirst({
      where: { id: documentId, propertyId: property.id },
    });

    if (!document) {
      throw new NotFoundException(
        `Document '${documentId}' not found on this property`,
      );
    }

    await this.prisma.propertyDocument.delete({
      where: { id: document.id },
    });

    await this.auditService.log({
      userId,
      action: 'PROPERTY_DOCUMENT_DELETED',
      entityType: 'PropertyDocument',
      entityId: document.id,
      oldValues: {
        documentType: document.documentType,
        documentNumber: document.documentNumber,
      },
    });

    return { message: 'Document removed successfully' };
  }

  async getVerificationDossier(propertyId: string) {
    const property = await this.findProperty(propertyId);

    const [verification, documents] = await Promise.all([
      this.prisma.propertyVerification.findUnique({
        where: { propertyId: property.id },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.propertyDocument.findMany({
        where: { propertyId: property.id },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          verifiedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const auditLogs = verification
      ? await this.auditService.getEntityLogs(
          'PropertyVerification',
          verification.id,
        )
      : [];

    return {
      property: {
        id: property.id,
        propertyCode: property.propertyCode,
        title: property.title,
        propertyType: property.propertyType,
        address: property.address,
        city: property.city,
        state: property.state,
      },
      verification,
      documents,
      auditLogs,
    };
  }

  async getPublicVerificationSummary(propertyId: string) {
    const property = await this.findProperty(propertyId);

    const [verification, documents] = await Promise.all([
      this.prisma.propertyVerification.findUnique({
        where: { propertyId: property.id },
      }),
      this.prisma.propertyDocument.findMany({
        where: { propertyId: property.id, status: 'VERIFIED' },
        select: {
          documentType: true,
          status: true,
          verifiedAt: true,
        },
      }),
    ]);

    return {
      propertyCode: property.propertyCode,
      verificationStatus: verification?.status ?? 'NOT_SUBMITTED',
      riskLevel: verification?.riskLevel ?? 'LOW',
      verifiedAt: verification?.completedAt ?? null,
      remarks:
        verification?.status === 'VERIFIED'
          ? verification.remarks
          : 'Verification in progress or pending due diligence.',
      verifiedDocuments: documents.map((d) => ({
        type: d.documentType,
        verifiedAt: d.verifiedAt,
      })),
    };
  }

  async findAllVerifications(query: VerificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyVerificationWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.riskLevel) {
      where.riskLevel = query.riskLevel;
    }

    if (query.assignedTo) {
      where.assignedToId = query.assignedTo;
    }

    if (query.search) {
      where.OR = [
        { verificationCode: { contains: query.search, mode: 'insensitive' } },
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

    const [total, verifications] = await Promise.all([
      this.prisma.propertyVerification.count({ where }),
      this.prisma.propertyVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
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
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data: verifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async findProperty(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        OR: [{ id: propertyId }, { propertyCode: propertyId }],
        deletedAt: null,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${propertyId}' not found`);
    }

    return property;
  }

  private async findVerificationByProperty(propertyId: string) {
    const property = await this.findProperty(propertyId);

    const verification = await this.prisma.propertyVerification.findUnique({
      where: { propertyId: property.id },
    });

    if (!verification) {
      throw new NotFoundException(
        `Verification record for property '${propertyId}' not found`,
      );
    }

    return verification;
  }
}
