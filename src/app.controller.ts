import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/public.decorator.js';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API Root' })
  getRoot() {
    return {
      name: 'NIMI KINGS LTD - Backend API',
      version: '1.0.0',
      status: 'online',
      docs: '/api/docs',
      health: '/api/v1/health',
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'API Health Check' })
  getHealth() {
    return {
      status: 'ok',
      service: 'NIMI KINGS Backend API',
      timestamp: new Date().toISOString(),
    };
  }
}
