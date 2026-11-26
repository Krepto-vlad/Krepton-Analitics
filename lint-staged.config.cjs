/** @type {import('lint-staged').Config} */
module.exports = {
  'frontend/**/*.{ts,tsx,scss}': (files) => {
    const quotedFiles = files.map((file) => `"${file}"`).join(' ');
    const commands = [`npm exec --prefix frontend -- prettier --write ${quotedFiles}`];

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
