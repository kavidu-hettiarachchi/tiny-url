import { Test, TestingModule } from '@nestjs/testing';
import { UrlMappingService } from './url-mapping.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RedirectType } from './dto/url-mapping.enums';

describe('UrlMappingService', () => {
  let service: UrlMappingService;
  let prismaService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlMappingService,
        {
          provide: PrismaService,
          useValue: {
            urlMapping: {
              findFirst: jest.fn(() => null),
              create: jest.fn(() => ({
                id: 1, // Assuming an ID is returned
                shortCode: 'abcdefghij',
                longUrl: 'https://example.com',
                redirectType: RedirectType.TEMPORARILY,
                visitCount: 0,
                lastVisited: null,
              })),
              findUnique: jest.fn(),
              findMany: jest.fn(() => []),
              update: jest.fn().mockResolvedValue({}),
              delete: jest.fn().mockResolvedValue({}),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'SHORT_URL_SIZE') return 10;
              if (key === 'BASE_URL') return 'http://localhost';
              if (key === 'PORT') return '3000';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UrlMappingService>(UrlMappingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('Create a new short URL for a valid URL', async () => {
    const createUrlInput = {
      longUrl: 'https://example.com',
      redirectType: RedirectType.TEMPORARILY,
    };
    const result = await service.createUrl(createUrlInput);

    expect(
      result.shortUrl.startsWith('http://localhost:3000/api/v1/tiny-url/'),
    ).toBe(true);
    expect(result.message).toEqual('URL created successfully');
  });

  it('Throw BadRequestException for invalid URL', async () => {
    await expect( service.createUrl({ longUrl: 'invalid', redirectType: RedirectType.TEMPORARILY }))
      .rejects
      .toThrow(BadRequestException);
  });

  // New test for getUrl
  it('Retrieve a URL by its shortCode', async () => {
    const mockShortCode = 'abcdefghij';
    const mockLongUrl = 'https://example.com';
    prismaService.urlMapping.findUnique.mockResolvedValue({
      shortCode: mockShortCode,
      longUrl: mockLongUrl,
      visitCount: 1,
      lastVisited: new Date(),
    });

    const result = await service.getUrl({ shortCode: mockShortCode });

    expect(result.longUrl).toEqual(mockLongUrl);
    expect(prismaService.urlMapping.update).toHaveBeenCalled(); // Check if the visitCount was attempted to be updated
  });

  // Test for handling not found URL
  it('Throw NotFoundException when URL not found by shortCode', async () => {
    prismaService.urlMapping.findUnique.mockResolvedValue(null);

    await expect(service.getUrl({ shortCode: 'nonexistent' })).rejects.toThrow(
      NotFoundException,
    );
  });

  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('error', { code, clientVersion: 'test' });

  it('Reject URLs without an http(s) protocol', async () => {
    await expect(
      service.createUrl({ longUrl: 'example.com', redirectType: RedirectType.TEMPORARILY }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createUrl({ longUrl: 'ftp://example.com', redirectType: RedirectType.TEMPORARILY }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Return the existing short URL for a duplicate', async () => {
    prismaService.urlMapping.findFirst.mockResolvedValueOnce({
      shortCode: 'existing01',
      redirectType: RedirectType.TEMPORARILY,
    });
    const result = await service.createUrl({
      longUrl: 'https://example.com',
      redirectType: RedirectType.TEMPORARILY,
    });
    expect(result.message).toEqual('URL already exists');
    expect(result.shortUrl.endsWith('/existing01')).toBe(true);
    expect(prismaService.urlMapping.create).not.toHaveBeenCalled();
  });

  it('Retry creation when the short code collides', async () => {
    prismaService.urlMapping.create
      .mockRejectedValueOnce(prismaError('P2002'))
      .mockResolvedValueOnce({});
    const result = await service.createUrl({
      longUrl: 'https://example.com',
      redirectType: RedirectType.TEMPORARILY,
    });
    expect(result.message).toEqual('URL created successfully');
    expect(prismaService.urlMapping.create).toHaveBeenCalledTimes(2);
  });

  it('Throw InternalServerErrorException on unexpected create failure', async () => {
    prismaService.urlMapping.create.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.createUrl({ longUrl: 'https://example.com', redirectType: RedirectType.TEMPORARILY }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('Return details for an existing shortCode', async () => {
    prismaService.urlMapping.findUnique.mockResolvedValue({
      shortCode: 'abc',
      longUrl: 'https://example.com',
      redirectType: RedirectType.TEMPORARILY,
      visitCount: 2,
      lastVisited: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await service.getDetail({ shortCode: 'abc' });
    expect(result.shortUrl).toEqual('http://localhost:3000/api/v1/tiny-url/abc');
    expect(result.visitCount).toBe(2);
  });

  it('Throw NotFoundException for details of a missing shortCode', async () => {
    prismaService.urlMapping.findUnique.mockResolvedValue(null);
    await expect(service.getDetail({ shortCode: 'nope' })).rejects.toThrow(NotFoundException);
  });

  it('Update a URL', async () => {
    prismaService.urlMapping.update.mockResolvedValue({
      shortCode: 'abc',
      redirectType: RedirectType.PERMANENTLY,
    });
    const result = await service.updateUrl('abc', {
      longUrl: 'https://example.org',
      redirectType: RedirectType.PERMANENTLY,
    });
    expect(result.message).toEqual('URL updated successfully');
  });

  it('Throw NotFoundException when updating a missing shortCode', async () => {
    prismaService.urlMapping.update.mockRejectedValue(prismaError('P2025'));
    await expect(
      service.updateUrl('nope', { longUrl: 'https://example.org', redirectType: RedirectType.TEMPORARILY }),
    ).rejects.toThrow(NotFoundException);
  });

  it('Throw BadRequestException when updating with an invalid URL', async () => {
    await expect(
      service.updateUrl('abc', { longUrl: 'bad', redirectType: RedirectType.TEMPORARILY }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Delete a URL', async () => {
    await expect(service.deleteUrl('abc')).resolves.toEqual({ message: 'URL deleted successfully' });
  });

  it('Throw NotFoundException when deleting a missing shortCode', async () => {
    prismaService.urlMapping.delete.mockRejectedValue(prismaError('P2025'));
    await expect(service.deleteUrl('nope')).rejects.toThrow(NotFoundException);
  });

  it('Reject URLs longer than the allowed maximum', async () => {
    const longUrl = `https://example.com/${'a'.repeat(2100)}`;
    await expect(
      service.createUrl({ longUrl, redirectType: RedirectType.TEMPORARILY }),
    ).rejects.toThrow(BadRequestException);
  });
});
