import { Module } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service.js';
import { EnquiriesController } from './enquiries.controller.js';
import { AuditModule } from '../common/audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
