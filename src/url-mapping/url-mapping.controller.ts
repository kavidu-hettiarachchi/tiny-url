import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  HttpException,
  HttpStatus,
  NotFoundException,
  ValidationPipe,
  UsePipes,
  Logger,
  Patch,
  Delete,
} from '@nestjs/common';
import { UrlCreationResponse, UrlMappingService, UrlInfoResponse } from './url-mapping.service';
import { CreateUrlEntryDto, GetUrlByShortCodeDto } from './dto/url-mapping.dto';
import { RedirectType } from './dto/url-mapping.enums';
import { Response } from 'express';

// Controller for the version 1 of the Tiny URL service.
@Controller('/v1/tiny-url')
export class UrlMappingController {
  private readonly logger = new Logger(UrlMappingController.name);

  constructor(private service: UrlMappingService) {
  }

  // Endpoint for creating a new shortened URL
  @Post('create')
  async shortenUrl(@Body() dto: CreateUrlEntryDto): Promise<UrlCreationResponse> {
    try {
      const result = await this.service.createUrl(dto);
      this.logger.log(`URL created: ${result.shortUrl}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create URL: ${error.message}`);
      throw new HttpException(
        'Failed to create URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Endpoint for fetching all URLs
  @Get('/getAll')
  async getAllUrls(): Promise<UrlInfoResponse[]> {
    try {
      return await this.service.getAllUrls();
    } catch (error) {
      this.logger.error('Failed to fetch all URLs', error.stack);
      throw new HttpException('Failed to fetch all URLs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Endpoint for redirecting a request based on a short code.
  @Get(':shortCode')
  @UsePipes(new ValidationPipe({ transform: true }))
  async redirect(@Res() res: Response, @Param() params: GetUrlByShortCodeDto) {
    try {
      const url = await this.service.getUrl(params);
      const statusCode = url.redirectType === RedirectType.PERMANENTLY ? 301 : 302;
      res.redirect(statusCode, url.longUrl);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(404).json({ message: 'URL not found' });
      }
      this.logger.error(`Error fetching URL: ${error.message}`);
      throw new HttpException(
        'Error fetching URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Get One recode details
  @Get('/getDetail/:shortCode')
  async getDetail(@Param('shortCode') shortCode: string): Promise<UrlInfoResponse> {
    try {
      const dto = new GetUrlByShortCodeDto();
      dto.shortCode = shortCode;
      return this.service.getDetail(dto);
    } catch (error) {
      this.logger.error(`Failed to get URL details: ${error.message}`);
      throw new HttpException('Failed to get URL details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update a URL
  @Patch(':shortCode')
  async updateUrl(@Param('shortCode') shortCode: string, @Body() dto: CreateUrlEntryDto): Promise<UrlCreationResponse> {
    try {
      return await this.service.updateUrl(shortCode, dto);
    } catch (error) {
      this.logger.error(`Failed to update URL: ${error.message}`);
      throw new HttpException('Failed to update URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Delete a URL
  @Delete(':shortCode')
  async deleteUrl(@Param('shortCode') shortCode: string): Promise<{ message: string }> {
    try {
      return await this.service.deleteUrl(shortCode);
    } catch (error) {
      this.logger.error(`Failed to delete URL: ${error.message}`);
      throw new HttpException('Failed to delete URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}