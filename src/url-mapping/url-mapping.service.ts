import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { isURL } from 'class-validator';
import { nanoid } from 'nanoid';
import {
  CreateUrlEntryDto,
  GetUrlByShortCodeDto,
  UpdateUrlEntryDto,
} from './dto/url-mapping.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RedirectType } from './dto/url-mapping.enums';

// Interfaces for URL creation, update, and information response.
export interface UrlCreationResponse {
  shortUrl: string;
  redirectType?: RedirectType;
  message: string;
}

export interface UrlUpdateResponse extends UrlCreationResponse {}

export interface UrlInfoResponse {
  shortUrl: string;
  longUrl: string;
  redirectType: RedirectType;
  visitCount: number;
  lastVisited: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Service for URL mapping operations
@Injectable()
export class UrlMappingService {
  private readonly logger = new Logger(UrlMappingService.name);
  private readonly shortCodeSize: number;
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Configuration initialization.
    this.shortCodeSize = +this.configService.get<number>('SHORT_URL_SIZE', 6);
    const baseURL = this.configService.get<string>('BASE_URL', 'http://localhost');
    const port = this.configService.get<string>('PORT', '3000');
    const v1Prefix = 'api/v1/tiny-url';
    this.appUrl = `${baseURL}:${port}/${v1Prefix}`;
  }

  // Creates a new URL entry and returns its shortened version.
  async createUrl(dto: CreateUrlEntryDto): Promise<UrlCreationResponse> {
    if (!isURL(dto.longUrl)) {
      throw new BadRequestException('Not Valid URL');
    }

    const shortCode = nanoid(this.shortCodeSize);

    try {
      const existingUrl = await this.prisma.urlMapping.findFirst({
        where: { longUrl: dto.longUrl, redirectType: dto.redirectType },
      });

      if (existingUrl) {
        this.logger.warn(`URL already exists: ${this.appUrl}/${shortCode}.`);
        return {
          shortUrl: `${this.appUrl}/${existingUrl.shortCode}`,
          redirectType: existingUrl.redirectType as RedirectType,
          message: 'URL already exists',
        };
      }

      await this.prisma.urlMapping.create({
        data: {
          shortCode,
          longUrl: dto.longUrl,
          redirectType: dto.redirectType,
        },
      });

      return {
        shortUrl: `${this.appUrl}/${shortCode}`,
        redirectType: dto.redirectType,
        message: 'URL created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create URL');
      throw new InternalServerErrorException('Server Error');
    }
  }

  // Retrieves and updates the visit count for a URL by its shortcode.
  async getUrl(dto: GetUrlByShortCodeDto): Promise<any> {
    try {
      const url = await this.prisma.urlMapping.findUnique({
        where: { shortCode: dto.shortCode },
      });

      if (!url) {
        throw new NotFoundException(
          `URL Not Found '${this.appUrl}/${dto.shortCode}'`,
        );
      }

      await this.prisma.urlMapping.update({
        where: { id: url.id },
        data: {
          visitCount: { increment: 1 },
          lastVisited: new Date(),
        },
      });

      this.logger.log(`URL retrieved: ${url.longUrl}`);
      return url;
    } catch (error) {
      this.logger.error('Failed to retrieve URL', error.stack);
      throw new NotFoundException('Resource Not Found');
    }
  }

  // Fetches all URL records.
  async getAllUrls(): Promise<UrlInfoResponse[]> {
    try {
      const urls = await this.prisma.urlMapping.findMany();
      return urls.map(url => ({
        shortUrl: `${this.appUrl}/${url.shortCode}`,
        longUrl: url.longUrl,
        redirectType: url.redirectType as RedirectType,
        visitCount: url.visitCount,
        lastVisited: url.lastVisited,
        createdAt: url.createdAt,
        updatedAt: url.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch URLs', error.stack);
      throw new BadRequestException('An unexpected error occurred while fetching URLs');
    }
  }

  // Retrieves detailed info for a single URL by shortcode.
  async getDetail(dto: GetUrlByShortCodeDto): Promise<UrlInfoResponse> {
    try {
      const url = await this.prisma.urlMapping.findUnique({
        where: { shortCode: dto.shortCode },
      });

      if (!url) {
        throw new NotFoundException(`URL with shortCode '${dto.shortCode}' not found.`);
      }

      return {
        shortUrl: `${this.appUrl}/${url.shortCode}`,
        longUrl: url.longUrl,
        redirectType: url.redirectType as RedirectType,
        visitCount: url.visitCount,
        lastVisited: url.lastVisited,
        createdAt: url.createdAt,
        updatedAt: url.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch URL with shortCode '${dto.shortCode}': ${error.stack}`);
      throw new BadRequestException(`An unexpected error occurred while fetching URL with shortCode '${dto.shortCode}'.`);
    }
  }

  // Updates a URL record's long URL and/or redirect type.
  async updateUrl(
    shortCode: string,
    dto: UpdateUrlEntryDto,
  ): Promise<UrlUpdateResponse> {
    if (!isURL(dto.longUrl)) {
      throw new BadRequestException('Not a valid URL');
    }

    try {
      const existingUrl = await this.prisma.urlMapping.findFirst({
        where: {
          shortCode: { not: shortCode },
          longUrl: dto.longUrl,
          redirectType: dto.redirectType,
        },
      });

      if (existingUrl) {
        this.logger.warn(`Unable to update - A URL with the same Long URL and Redirect Type already exists. Short URL: ${this.appUrl}/${shortCode}`);
        return {
          shortUrl: `${this.appUrl}/${existingUrl.shortCode}`,
          redirectType: existingUrl.redirectType as RedirectType,
          message: 'Unable to update - A URL with the same Long URL and Redirect Type already exists.',
        };
      }

      const updatedUrl = await this.prisma.urlMapping.update({
        where: { shortCode },
        data: dto,
      });

      this.logger.log(`URL updated successfully, Short URL: ${this.appUrl}/${shortCode}`);
      return {
        shortUrl: `${this.appUrl}/${updatedUrl.shortCode}`,
        redirectType: updatedUrl.redirectType as RedirectType,
        message: 'URL updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update URL', error.stack);
      throw new InternalServerErrorException('Failed to update URL');
    }
  }

  // Deletes a URL record by its shortcode.
  async deleteUrl(shortCode: string): Promise<{ message: string }> {
    try {
      await this.prisma.urlMapping.delete({
        where: { shortCode },
      });
      this.logger.log(`URL with shortCode ${this.appUrl}/${shortCode} deleted successfully`);
      return { message: 'URL deleted successfully' };
    } catch (error) {
      this.logger.error('Failed to delete URL', error.stack);
      throw new NotFoundException('Failed to delete URL');
    }
  }
}