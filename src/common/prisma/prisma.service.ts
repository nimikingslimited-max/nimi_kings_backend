import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const connectionString =
      configService.get<string>('DATABASE_URL') ||
      process.env.DATABASE_URL ||
      '';
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      // Eagerly verify PostgreSQL connection on startup
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ PostgreSQL database connected successfully.');
    } catch (error: any) {
      this.logger.error(
        `❌ Database connection failed: ${error.message}`,
      );
      this.logger.error(
        '👉 Please verify that:\n' +
          '   1. PostgreSQL is installed and actively running on your system or Docker.\n' +
          '   2. DATABASE_URL in your .env file has the correct host, port (e.g. 5432 vs 5433), username, and password.\n' +
          '   3. Database migrations have been applied ("npx prisma migrate dev").',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
