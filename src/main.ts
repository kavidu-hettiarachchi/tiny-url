import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

async function bootstrap() {
  // Configure dotenv to load environment variables from the .env file
  dotenv.config();

  // Retrieve the from environment variables
  const PORT = process.env.PORT || '3000';
  const BASE_URL = process.env.BASE_URL || 'http://localhost';

  try {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    // Set a global route prefix
    app.setGlobalPrefix('api');

    // Start listening defined port
    await app.listen(PORT, () => {
      console.log(`Server is running at ${BASE_URL}:${PORT}`);
    });
  } catch (error) {
    // Log the error if the application fails to start
    console.error('Failed to start the application', error);
    process.exit(1);
  }
}

bootstrap();