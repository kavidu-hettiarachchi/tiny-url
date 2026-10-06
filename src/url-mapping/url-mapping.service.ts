import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isURL } from 'class-validator';
import { nanoid } from 'nanoid';
import {
  CreateUrlEntryDto,
  GetUrlByShortCodeDto,
  UpdateUrlEntryDto,
  LONG_URL_OPTIONS,
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

// Prisma error codes handled explicitly.
const UNIQUE_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

// Number of attempts to generate a collision free short code.
const MAX_CODE_ATTEMPTS = 5;

// Short codes that would clash with static routes.
const RESERVED_CODES = new Set(['getAll', 'getDetail']);

const isPrismaError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

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

  // Generates a short code that does not clash with a reserved route.
  private generateShortCode(): string {
    let code = nanoid(this.shortCodeSize);
    while (RESERVED_CODES.has(code)) {
      code = nanoid(this.shortCodeSize);
    }
    return code;
  }

  // Creates a new URL entry and returns its shortened version.
  async createUrl(dto: CreateUrlEntryDto): Promise<UrlCreationResponse> {
    if (!isURL(dto.longUrl, LONG_URL_OPTIONS)) {
      throw new BadRequestException('Not Valid URL');
    }

    try {
      for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
        const existingUrl = await this.prisma.urlMapping.findFirst({
          where: { longUrl: dto.longUrl, redirectType: dto.redirectType },
        });

        if (existingUrl) {
          this.logger.warn(`URL already exists: ${this.appUrl}/${existingUrl.shortCode}.`);
          return {
            shortUrl: `${this.appUrl}/${existingUrl.shortCode}`,
            redirectType: existingUrl.redirectType as RedirectType,
            message: 'URL already exists',
          };
        }

        const shortCode = this.generateShortCode();
        try {
          await this.prisma.urlMapping.create({
            data: {
              shortCode,
              longUrl: dto.longUrl,
              redirectType: dto.redirectType,
            },
          });
        } catch (error) {
          // Either the short code collided or a concurrent request stored the
          // same URL first; loop again to re-check and retry.
          if (isPrismaError(error, UNIQUE_VIOLATION)) {
            continue;
          }
          throw error;
        }

        return {
          shortUrl: `${this.appUrl}/${shortCode}`,
          redirectType: dto.redirectType,
          message: 'URL created successfully',
        };
      }
      throw new Error('Unable to generate a unique short code');
    } catch (error) {
      this.logger.error('Failed to create URL', error.stack);
      throw new InternalServerErrorException('Server Error');
    }
  }

  // Retrieves a URL by its shortcode and records the visit.
  async getUrl(dto: GetUrlByShortCodeDto): Promise<any> {
    let url;
    try {
      url = await this.prisma.urlMapping.findUnique({
        where: { shortCode: dto.shortCode },
      });
    } catch (error) {
      this.logger.error('Failed to retrieve URL', error.stack);
      throw new InternalServerErrorException('Failed to retrieve URL');
    }

    if (!url) {
      throw new NotFoundException(`URL Not Found '${this.appUrl}/${dto.shortCode}'`);
    }

    // The visit counter must not delay or break the redirect.
    this.prisma.urlMapping
      .update({
        where: { id: url.id },
        data: {
          visitCount: { increment: 1 },
          lastVisited: new Date(),
        },
      })
      .catch((error) => this.logger.error('Failed to record visit', error.stack));

    this.logger.log(`URL retrieved: ${url.longUrl}`);
    return url;
  }

  // Fetches URL records, newest first, with simple offset pagination.
  async getAllUrls(skip = 0, take = 100): Promise<UrlInfoResponse[]> {
    try {
      const urls = await this.prisma.urlMapping.findMany({
        orderBy: { id: 'desc' },
        skip,
        take,
      });
      return urls.map((url) => this.toInfoResponse(url));
    } catch (error) {
      this.logger.error('Failed to fetch URLs', error.stack);
      throw new InternalServerErrorException('An unexpected error occurred while fetching URLs');
    }
  }

  // Retrieves detailed info for a single URL by shortcode.
  async getDetail(dto: GetUrlByShortCodeDto): Promise<UrlInfoResponse> {
    let url;
    try {
      url = await this.prisma.urlMapping.findUnique({
        where: { shortCode: dto.shortCode },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch URL with shortCode '${dto.shortCode}'`, error.stack);
      throw new InternalServerErrorException('An unexpected error occurred while fetching the URL');
    }

    if (!url) {
      throw new NotFoundException(`URL with shortCode '${dto.shortCode}' not found.`);
    }
    return this.toInfoResponse(url);
  }

  // Updates a URL record's long URL and/or redirect type.
  async updateUrl(
    shortCode: string,
    dto: UpdateUrlEntryDto,
  ): Promise<UrlUpdateResponse> {
    if (!isURL(dto.longUrl, LONG_URL_OPTIONS)) {
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
      if (isPrismaError(error, RECORD_NOT_FOUND)) {
        throw new NotFoundException(`URL with shortCode '${shortCode}' not found.`);
      }
      if (error instanceof HttpException) {
        throw error;
      }
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
      if (isPrismaError(error, RECORD_NOT_FOUND)) {
        throw new NotFoundException(`URL with shortCode '${shortCode}' not found.`);
      }
      this.logger.error('Failed to delete URL', error.stack);
      throw new InternalServerErrorException('Failed to delete URL');
    }
  }

  // Maps a stored record to the public info response.
  private toInfoResponse(url: {
    shortCode: string;
    longUrl: string;
    redirectType: string;
    visitCount: number;
    lastVisited: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): UrlInfoResponse {
    return {
      shortUrl: `${this.appUrl}/${url.shortCode}`,
      longUrl: url.longUrl,
      redirectType: url.redirectType as RedirectType,
      visitCount: url.visitCount,
      lastVisited: url.lastVisited,
      createdAt: url.createdAt,
      updatedAt: url.updatedAt,
    };
  }
}
