/** @type {import('lint-staged').Config} */
module.exports = {
  'frontend/**/*.{ts,tsx,scss}': (files) => {
    const commands = [`prettier --write ${files.map((file) => `"${file}"`).join(' ')}`];

    if (files.some((file) => file.endsWith('.ts') || file.endsWith('.tsx'))) {
      commands.push('npm run lint:fix --prefix frontend');
    }

    return commands;
  },

  'backend/**/*.ts': (files) => [
    `prettier --write ${files.map((file) => `"${file}"`).join(' ')}`,
    'npm run lint:fix --prefix backend',
  ],
};
