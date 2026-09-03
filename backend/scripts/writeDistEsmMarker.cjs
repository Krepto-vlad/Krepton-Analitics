'use strict';

const fs = require('node:fs');
const path = require('node:path');

const distDirectory = path.join(__dirname, '..', 'dist');
fs.mkdirSync(distDirectory, { recursive: true });
fs.writeFileSync(
  path.join(distDirectory, 'package.json'),
  `${JSON.stringify({ type: 'module' }, null, 2)}\n`
);
