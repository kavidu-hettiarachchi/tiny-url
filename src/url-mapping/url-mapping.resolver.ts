import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UrlMappingService } from './url-mapping.service';
import { ApolloError, UserInputError } from 'apollo-server-express';
import { NotFoundException } from '@nestjs/common';
import {
  CreateUrlInput,
  UrlCreationResponse,
  UrlInfoResponse,
  UpdateUrlInput,
  UrlUpdateResponse,
} from './dto/url-mapping.dto';
import { RedirectType } from './dto/url-mapping.enums';

@Resolver()
export class UrlMappingResolver {
  constructor(private readonly urlMappingService: UrlMappingService) {}

  // Retrieves a list of all URLs
  @Query(() => [UrlInfoResponse])
  async getAllUrls(): Promise<UrlInfoResponse[]> {
    try {
      return await this.urlMappingService.getAllUrls();
    } catch (error) {
      throw new ApolloError('Failed to retrieve URLs', 'INTERNAL_SERVER_ERROR');
    }
  }

  // Retrieves detailed information
  @Query(() => UrlInfoResponse, { nullable: true })
  async getUrlDetail(@Args('shortCode') shortCode: string): Promise<UrlInfoResponse> {
    try {
      return await this.urlMappingService.getDetail({ shortCode });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ApolloError('URL not found', 'NOT_FOUND');
      }
      throw new ApolloError('Error fetching URL details', 'INTERNAL_SERVER_ERROR');
    }
  }

  // Creates a new shortened URL
  @Mutation(() => UrlCreationResponse)
  async createShortUrl(@Args('create') createUrlInput: CreateUrlInput): Promise<UrlCreationResponse> {
    try {
      return await this.urlMappingService.createUrl(createUrlInput);
    } catch (error) {
      throw new UserInputError('Failed to create URL due to invalid input');
    }
  }

  // Updates an existing URL
  @Mutation(() => UrlUpdateResponse)
  async updateUrl(
    @Args('shortCode') shortCode: string,
    @Args('update') updateUrlInput: UpdateUrlInput,
  ): Promise<UrlUpdateResponse> {
    try {
      const updatedUrl = await this.urlMappingService.updateUrl(
        shortCode,
        updateUrlInput,
      );
      return {
        shortUrl: updatedUrl.shortUrl,
        redirectType: updatedUrl.redirectType ?? RedirectType.TEMPORARILY,
        message: updatedUrl.message,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ApolloError('URL not found for update', 'NOT_FOUND');
      }
      throw new ApolloError('Failed to update URL', 'INTERNAL_SERVER_ERROR');
    }
  }

  // Deletes an existing URL
  @Mutation(() => String)
  async deleteUrl(@Args('shortCode') shortCode: string): Promise<string> {
    try {
      await this.urlMappingService.deleteUrl(shortCode);
      return 'URL deleted successfully';
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ApolloError('URL not found for deletion', 'NOT_FOUND');
      }
      throw new ApolloError('Failed to delete URL', 'INTERNAL_SERVER_ERROR');
    }
  }
}
