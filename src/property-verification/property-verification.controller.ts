import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { PropertyVerificationService } from './property-verification.service.js';
import { SubmitVerificationDto } from './dto/submit-verification.dto.js';
import { AssignOfficerDto } from './dto/assign-officer.dto.js';
import { ReviewVerificationDto } from './dto/review-verification.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { VerifyDocumentDto } from './dto/verify-document.dto.js';
import { VerificationQueryDto } from './dto/verification-query.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Property Verification')
@Controller('property-verification')
export class PropertyVerificationController {
  constructor(
    private readonly verificationService: PropertyVerificationService,
  ) {}

  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.VERIFICATION_OFFICER,
    RoleType.PROPERTY_MANAGER,
  )
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List and filter all property verifications (Staff & Admins)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of property verification records',
  })
  findAll(@Query() query: VerificationQueryDto) {
    return this.verificationService.findAllVerifications(query);
  }

  @Public()
  @Get(':propertyId/public')
  @ApiOperation({
    summary:
      'Get public verification badge and verified documents summary (No Auth)',
  })
  @ApiResponse({
    status: 200,
    description: 'Public verification status, risk badge, and verified certificates',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  getPublicSummary(@Param('propertyId') propertyId: string) {
    return this.verificationService.getPublicVerificationSummary(propertyId);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.VERIFICATION_OFFICER,
    RoleType.PROPERTY_MANAGER,
  )
  @Get(':propertyId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Get complete property verification dossier, documents, and audit history',
  })
  @ApiResponse({
    status: 200,
    description: 'Full verification record, document items, and audit log',
  })
  @ApiResponse({ status: 404, description: 'Property or verification not found' })
  getDossier(@Param('propertyId') propertyId: string) {
    return this.verificationService.getVerificationDossier(propertyId);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Post(':propertyId/submit')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit a property for legal verification / due diligence review',
  })
  @ApiResponse({
    status: 200,
    description: 'Property verification submitted, status set to PENDING',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  submit(
    @Param('propertyId') propertyId: string,
    @Body() dto: SubmitVerificationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.submitForVerification(
      propertyId,
      dto,
      userId,
    );
  }

  @Roles(
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Patch(':propertyId/assign')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Assign an internal verification officer / legal staff to conduct due diligence',
  })
  @ApiResponse({
    status: 200,
    description: 'Officer successfully assigned, status moved to IN_PROGRESS',
  })
  @ApiResponse({ status: 400, description: 'Assigned officer is invalid or inactive' })
  @ApiResponse({ status: 404, description: 'Property or verification record not found' })
  assignOfficer(
    @Param('propertyId') propertyId: string,
    @Body() dto: AssignOfficerDto,
    @CurrentUser('id') assignerId: string,
  ) {
    return this.verificationService.assignOfficer(
      propertyId,
      dto,
      assignerId,
    );
  }

  @Roles(
    RoleType.VERIFICATION_OFFICER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Post(':propertyId/review')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Review verification dossier and submit legal verdict (VERIFIED / FLAGGED / REJECTED) with risk level',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification reviewed and finalized with risk rating',
  })
  @ApiResponse({ status: 404, description: 'Property or verification record not found' })
  review(
    @Param('propertyId') propertyId: string,
    @Body() dto: ReviewVerificationDto,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.verificationService.reviewVerification(
      propertyId,
      dto,
      reviewerId,
    );
  }

  @Roles(
    RoleType.AGENT,
    RoleType.VERIFICATION_OFFICER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Post(':propertyId/documents')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload a title / legal document (C of O, Survey Plan, Deed, etc.)',
  })
  @ApiResponse({
    status: 201,
    description: 'Document record attached to property verification dossier',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  uploadDocument(
    @Param('propertyId') propertyId: string,
    @Body() dto: UploadDocumentDto,
    @CurrentUser('id') uploaderId: string,
  ) {
    return this.verificationService.uploadDocument(
      propertyId,
      dto,
      uploaderId,
    );
  }

  @Roles(
    RoleType.VERIFICATION_OFFICER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Patch(':propertyId/documents/:documentId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Verify, flag, or reject a single uploaded title document after registry check',
  })
  @ApiResponse({
    status: 200,
    description: 'Document verification status updated',
  })
  @ApiResponse({ status: 404, description: 'Document or property not found' })
  verifyDocument(
    @Param('propertyId') propertyId: string,
    @Param('documentId') documentId: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser('id') officerId: string,
  ) {
    return this.verificationService.verifyDocument(
      propertyId,
      documentId,
      dto,
      officerId,
    );
  }

  @Roles(
    RoleType.AGENT,
    RoleType.VERIFICATION_OFFICER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
    RoleType.PROPERTY_MANAGER,
  )
  @Delete(':propertyId/documents/:documentId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete / remove an uploaded document from property dossier',
  })
  @ApiResponse({
    status: 200,
    description: 'Document record successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Document or property not found' })
  removeDocument(
    @Param('propertyId') propertyId: string,
    @Param('documentId') documentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.verificationService.removeDocument(
      propertyId,
      documentId,
      userId,
    );
  }
}
