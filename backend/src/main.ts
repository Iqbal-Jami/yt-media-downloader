import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Explicit logging before anything else
process.stdout.write('=== STARTING MAIN.TS ===\n');

async function bootstrap() {
  try {
    process.stdout.write('1. Entering bootstrap function\n');
    
    process.stdout.write('2. About to create NestFactory...\n');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    process.stdout.write('3. NestFactory created successfully!\n');

    // Enable CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
      credentials: true,
    });

    // Enable validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Global prefix
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    process.stdout.write(`4. About to listen on port ${port}...\n`);
    await app.listen(port);
    
    process.stdout.write(`5. SUCCESS! Server listening on http://localhost:${port}/api\n`);
  } catch (error) {
    process.stdout.write(`ERROR in bootstrap: ${error}\n`);
    process.stdout.write(`Stack: ${error.stack}\n`);
    process.exit(1);
  }
}

process.stdout.write('=== CALLING BOOTSTRAP ===\n');
bootstrap().catch(err => {
  process.stdout.write(`UNHANDLED ERROR: ${err}\n`);
  process.exit(1);
});
