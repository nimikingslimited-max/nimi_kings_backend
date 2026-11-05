import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Admin Administration & Governance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get platform-wide operational KPIs, domain statistics, urgent action queues, and live activity feeds',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive administrative dashboard analytics payload',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMIN or SUPER_ADMIN role',
  })
  getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }
}
