import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  Logger,
  Patch,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { UrlCreationResponse, UrlMappingService, UrlInfoResponse } from './url-mapping.service';
import { CreateUrlEntryDto, GetUrlByShortCodeDto, UpdateUrlEntryDto } from './dto/url-mapping.dto';
import { RedirectType } from './dto/url-mapping.enums';
import { Response } from 'express';

const MAX_PAGE_SIZE = 100;

// Controller for the version 1 of the Tiny URL service.
// Errors thrown by the service are HttpExceptions, which Nest maps to the proper status code.
@Controller('/v1/tiny-url')
export class UrlMappingController {
  private readonly logger = new Logger(UrlMappingController.name);

  constructor(private service: UrlMappingService) {
  }

  // Endpoint for creating a new shortened URL
  @Post('create')
  async shortenUrl(@Body() dto: CreateUrlEntryDto): Promise<UrlCreationResponse> {
    const result = await this.service.createUrl(dto);
    this.logger.log(`URL created: ${result.shortUrl}`);
    return result;
  }

  // Endpoint for fetching URLs (paginated)
  @Get('/getAll')
  async getAllUrls(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(MAX_PAGE_SIZE), ParseIntPipe) take: number,
  ): Promise<UrlInfoResponse[]> {
    return this.service.getAllUrls(Math.max(skip, 0), Math.min(Math.max(take, 1), MAX_PAGE_SIZE));
  }

  // Get one record's details
  @Get('/getDetail/:shortCode')
  async getDetail(@Param() params: GetUrlByShortCodeDto): Promise<UrlInfoResponse> {
    return this.service.getDetail(params);
  }

  // Endpoint for redirecting a request based on a short code.
  @Get(':shortCode')
  async redirect(@Res() res: Response, @Param() params: GetUrlByShortCodeDto) {
    const url = await this.service.getUrl(params);
    const statusCode = url.redirectType === RedirectType.PERMANENTLY ? 301 : 302;
    res.redirect(statusCode, url.longUrl);
  }

  // Update a URL
  @Patch(':shortCode')
  async updateUrl(@Param() params: GetUrlByShortCodeDto, @Body() dto: UpdateUrlEntryDto): Promise<UrlCreationResponse> {
    return this.service.updateUrl(params.shortCode, dto);
  }

  // Delete a URL
  @Delete(':shortCode')
  async deleteUrl(@Param() params: GetUrlByShortCodeDto): Promise<{ message: string }> {
    return this.service.deleteUrl(params.shortCode);
  }
}
