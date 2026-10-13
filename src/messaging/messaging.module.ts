import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagingService } from './messaging.service.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingGateway } from './messaging.gateway.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    JwtModule.register({}),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
