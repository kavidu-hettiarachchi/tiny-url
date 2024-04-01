import { Test, TestingModule } from '@nestjs/testing';
import { UrlMappingService } from './url-mapping.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
              update: jest.fn(),
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
});
