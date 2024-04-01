import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// The @Global() decorator its providers available throughout the application
@Global()
@Module({
  //database access services.
  providers: [PrismaService],

  exports: [PrismaService],
})
export class PrismaModule {
}
