import { Module } from '@nestjs/common';
import { ConstructionController } from './construction.controller.js';
import { ConstructionService } from './construction.service.js';

@Module({
  controllers: [ConstructionController],
  providers: [ConstructionService],
  exports: [ConstructionService],
})
export class ConstructionModule {}
