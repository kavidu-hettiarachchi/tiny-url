import { Module } from '@nestjs/common';
import { UrlMappingService } from './url-mapping.service';
import { UrlMappingController } from './url-mapping.controller';
import { UrlMappingResolver } from './url-mapping.resolver';

//Defines urlMapping module with service and controller
@Module({
  providers: [UrlMappingService, UrlMappingResolver],
  controllers: [UrlMappingController],
})
export class UrlMappingModule {
}

