// Test with NestJS imports
process.stdout.write('TEST A: Starting test-nest.js\n');

const { NestFactory } = require('@nestjs/core');
process.stdout.write('TEST B: Required NestFactory\n');

let AppModule;
try {
  process.stdout.write('TEST C1: About to require AppModule...\n');
  AppModule = require('./dist/app.module').AppModule;
  process.stdout.write('TEST C2: Required AppModule successfully\n');
} catch (error) {
  process.stdout.write(`TEST C ERROR: ${error.message}\n${error.stack}\n`);
  process.exit(1);
}

async function test() {
  try {
    process.stdout.write('TEST D: Creating NestFactory...\n');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    process.stdout.write('TEST E: App created!\n');
    
    await app.listen(3000);
    process.stdout.write('TEST F: Listening on 3000!\n');
  } catch (error) {
    process.stdout.write(`TEST ERROR: ${error.message}\n${error.stack}\n`);
  }
}

process.stdout.write('TEST G: Calling test function\n');
test();
