const ALLOWED_PREFIXES = ['FRONT', 'BACK', 'FIX', 'DEPLOY', 'INIT'];

const COMMIT_MESSAGE_PATTERN = /^(FRONT|BACK|FIX|DEPLOY|INIT)(\s|:|\/|-).+/;

const message = require('fs').readFileSync(process.argv[2], 'utf8').trim();
const subject = message.split('\n')[0].trim();

if (!COMMIT_MESSAGE_PATTERN.test(subject)) {
  console.error('\n❌ Invalid commit message format.\n');
  console.error('Message must start with one of:', ALLOWED_PREFIXES.join(', '));
  console.error('Followed by space or colon and a description.\n');
  console.error('Examples:');
  console.error('  FRONT: add dashboard layout');
  console.error('  BACK: add stock quote endpoint');
  console.error('  FIX: resolve CORS issue');
  console.error('  DEPLOY: configure render service');
  console.error('  INIT: project structure setup\n');
  process.exit(1);
}

process.exit(0);
