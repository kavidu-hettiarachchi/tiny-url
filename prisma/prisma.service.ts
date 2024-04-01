import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({});
  }

  // Database connection is established.
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to the database.');
    } catch (error) {
      this.logger.error(
        'Failed to connect to the database on module init.',
        error,
      );
    }
  }

  // Database connection is cleanly closed.
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from the database.');
    } catch (error) {
      this.logger.error(
        'Failed to disconnect from the database on module destroy.',
        error,
      );
    }
  }
}
