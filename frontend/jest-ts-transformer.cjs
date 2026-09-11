const tsJest = require('ts-jest');

const IMPORT_META_STUB =
  '({ env: { VITE_API_URL: "http://localhost:3001", VITE_GOOGLE_CLIENT_ID: "", VITE_PADDLE_CLIENT_TOKEN: "", VITE_PADDLE_ENV: "sandbox" } })';

const tsTransformer = tsJest.default.createTransformer({
  tsconfig: './tsconfig.jest.json',
});

module.exports = {
  process(sourceText, sourcePath, options) {
    const rewritten = sourceText.replace(/import\.meta/g, IMPORT_META_STUB);
    return tsTransformer.process(rewritten, sourcePath, options);
  },
};
