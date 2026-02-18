// Simple test without any imports
process.stdout.write('TEST 1: process.stdout.write\n');
console.log('TEST 2: console.log');

async function testAsync() {
  process.stdout.write('TEST 3: Inside async function\n');
  return 'done';
}

process.stdout.write('TEST 4: Before calling async\n');
testAsync().then(() => {
  process.stdout.write('TEST 5: After async completed\n');
});
