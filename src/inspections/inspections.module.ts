import { Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service.js';
import { InspectionsController } from './inspections.controller.js';
import { AuditModule } from '../common/audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
