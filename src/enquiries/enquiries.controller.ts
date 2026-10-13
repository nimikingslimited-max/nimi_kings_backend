import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { EnquiriesService } from './enquiries.service.js';
import { CreateEnquiryDto } from './dto/create-enquiry.dto.js';
import { AssignEnquiryAgentDto } from './dto/assign-enquiry-agent.dto.js';
import { UpdateEnquiryStatusDto } from './dto/update-enquiry-status.dto.js';
import { EnquiryQueryDto } from './dto/enquiry-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Enquiries & Leads')
@ApiBearerAuth('JWT-auth')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post()
  @ApiOperation({
    summary:
      'Submit a new property enquiry (auto-routes to assigned property agent if available)',
  })
  @ApiResponse({
    status: 201,
    description: 'Enquiry created and routed successfully',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  create(
    @Body() dto: CreateEnquiryDto,
    @CurrentUser('id') customerId: string,
  ) {
    return this.enquiriesService.create(dto, customerId);
  }

  @Get('my-enquiries')
  @ApiOperation({
    summary: 'Get authenticated customer enquiries and assigned agent details',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of customer enquiries',
  })
  findMyEnquiries(
    @CurrentUser('id') customerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.enquiriesService.findMyEnquiries(
      customerId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Roles(
    RoleType.AGENT,
    RoleType.PROPERTY_MANAGER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Get()
  @ApiOperation({
    summary:
      'List and filter enquiries (Agents see their assigned leads; Admins see all)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of enquiries',
  })
  findAll(@Query() query: EnquiryQueryDto, @CurrentUser() user: any) {
    return this.enquiriesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single enquiry by ID' })
  @ApiResponse({ status: 200, description: 'Enquiry details' })
  @ApiResponse({ status: 404, description: 'Enquiry not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.enquiriesService.findOne(id, user);
  }

  @Roles(
    RoleType.PROPERTY_MANAGER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Patch(':id/assign')
  @ApiOperation({
    summary: 'Assign or re-assign a field agent to handle an enquiry',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent assigned and CustomerAgent relationship updated',
  })
  assignAgent(
    @Param('id') id: string,
    @Body() dto: AssignEnquiryAgentDto,
    @CurrentUser('id') assignerId: string,
  ) {
    return this.enquiriesService.assignAgent(id, dto, assignerId);
  }

  @Roles(
    RoleType.AGENT,
    RoleType.PROPERTY_MANAGER,
    RoleType.ADMIN,
    RoleType.SUPER_ADMIN,
  )
  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Update enquiry lifecycle status (IN_PROGRESS, RESOLVED, CLOSED)',
  })
  @ApiResponse({
    status: 200,
    description: 'Enquiry status updated',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.enquiriesService.updateStatus(id, dto, user);
  }
}
