import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { PropertyVerificationModule } from './property-verification/property-verification.module.js';
import { EnquiriesModule } from './enquiries/enquiries.module.js';
import { InspectionsModule } from './inspections/inspections.module.js';
import { PropertySearchModule } from './property-search/property-search.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { AuditModule } from './common/audit/audit.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    PropertiesModule,
    PropertyVerificationModule,
    PropertySearchModule,
    EnquiriesModule,
    InspectionsModule,
    NotificationsModule,
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
