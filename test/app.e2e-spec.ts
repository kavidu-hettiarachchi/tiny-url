import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../prisma/prisma.service';

// The database is replaced with an in-memory stub so the HTTP layer can be tested on its own.
describe('Tiny URL (e2e)', () => {
  let app: INestApplication;
  const rows: any[] = [];

  const prismaStub = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    urlMapping: {
      findFirst: jest.fn(async ({ where }) =>
        rows.find((r) => r.longUrl === where.longUrl && r.redirectType === where.redirectType) ?? null),
      findUnique: jest.fn(async ({ where }) => rows.find((r) => r.shortCode === where.shortCode) ?? null),
      findMany: jest.fn(async () => rows),
      create: jest.fn(async ({ data }) => {
        const row = { id: rows.length + 1, visitCount: 0, lastVisited: null, createdAt: new Date(), updatedAt: new Date(), ...data };
        rows.push(row);
        return row;
      }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /create rejects an invalid URL with 400', () => {
    return request(app.getHttpServer())
      .post('/api/v1/tiny-url/create')
      .send({ longUrl: 'example.com', redirectType: 'TEMPORARILY' })
      .expect(400);
  });

  it('creates a short URL and redirects to it', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/tiny-url/create')
      .send({ longUrl: 'https://example.com/page', redirectType: 'PERMANENTLY' })
      .expect(201);

    const shortCode = created.body.shortUrl.split('/').pop();

    await request(app.getHttpServer())
      .get(`/api/v1/tiny-url/${shortCode}`)
      .expect(301)
      .expect('Location', 'https://example.com/page');
  });

  it('GET unknown short code returns 404', () => {
    return request(app.getHttpServer()).get('/api/v1/tiny-url/unknown').expect(404);
  });

  it('GET /getDetail unknown short code returns 404', () => {
    return request(app.getHttpServer()).get('/api/v1/tiny-url/getDetail/unknown').expect(404);
  });
});
