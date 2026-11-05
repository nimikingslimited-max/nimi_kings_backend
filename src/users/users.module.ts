import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AuditModule } from '../common/audit/audit.module.js';
import { AdminModule } from '../admin/admin.module.js';

@Module({
  imports: [AuditModule, AdminModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
