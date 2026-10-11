import { Module } from '@nestjs/common';
import { PropertyVerificationService } from './property-verification.service.js';
import { PropertyVerificationController } from './property-verification.controller.js';
import { AuditModule } from '../common/audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [PropertyVerificationController],
  providers: [PropertyVerificationService],
  exports: [PropertyVerificationService],
})
export class PropertyVerificationModule {}
