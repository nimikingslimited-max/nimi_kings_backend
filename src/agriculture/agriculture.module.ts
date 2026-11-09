import { Module } from '@nestjs/common';
import { AgricultureController } from './agriculture.controller.js';
import { AgricultureService } from './agriculture.service.js';
import { AuditModule } from '../common/audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [AgricultureController],
  providers: [AgricultureService],
  exports: [AgricultureService],
})
export class AgricultureModule {}
