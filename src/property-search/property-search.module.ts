import { Module } from '@nestjs/common';
import { PropertySearchService } from './property-search.service.js';
import { PropertySearchController } from './property-search.controller.js';

@Module({
  controllers: [PropertySearchController],
  providers: [PropertySearchService],
  exports: [PropertySearchService],
})
export class PropertySearchModule {}
