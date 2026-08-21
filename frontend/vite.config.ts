import { defineConfig, loadEnv, type Plugin, type PluginOption, type PreviewServer } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_API_BASE_URL = 'http://localhost:3001';
const GOOGLE_ACCOUNTS_ORIGIN = 'https://accounts.google.com';
const GOOGLE_FONTS_STYLE_ORIGIN = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_FILE_ORIGIN = 'https://fonts.gstatic.com';
/** Clickjacking guard — HTTP header only; browsers ignore frame-ancestors in <meta>. */
const FRAME_ANCESTORS_CSP = "frame-ancestors 'none'";

function toWebSocketOrigin(httpOrigin: string): string {
  return httpOrigin.replace(/^http/i, 'ws');
}

function buildFrontendContentSecurityPolicy(apiBaseUrl: string): string {
  const apiOrigin = new URL(apiBaseUrl).origin;
  const webSocketOrigin = toWebSocketOrigin(apiOrigin);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    `script-src 'self' ${GOOGLE_ACCOUNTS_ORIGIN}`,
    `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_STYLE_ORIGIN} ${GOOGLE_ACCOUNTS_ORIGIN}`,
    `font-src 'self' ${GOOGLE_FONTS_FILE_ORIGIN}`,
    "img-src 'self' data: blob: https:",
    [
      "connect-src 'self'",
      apiOrigin,
      webSocketOrigin,
      GOOGLE_ACCOUNTS_ORIGIN,
      GOOGLE_FONTS_STYLE_ORIGIN,
      GOOGLE_FONTS_FILE_ORIGIN,
    ].join(' '),
    `frame-src ${GOOGLE_ACCOUNTS_ORIGIN}`,
    "worker-src 'self' blob:",
  ].join('; ');
}

function applyContentSecurityPolicy(metaPolicy: string): Plugin {
  function attachFrameAncestorsHeader(server: PreviewServer): void {
    server.middlewares.use((_request, response, next) => {
      response.setHeader('Content-Security-Policy', FRAME_ANCESTORS_CSP);
      response.setHeader('X-Frame-Options', 'DENY');
      next();
    });
  }

  return {
    name: 'html-content-security-policy',
    transformIndexHtml(html) {
      if (html.includes('Content-Security-Policy')) {
        return html;
      }

      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${metaPolicy}" />`
      );
    },
    configurePreviewServer(server) {
      attachFrameAncestorsHeader(server);
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_URL || DEFAULT_API_BASE_URL;
  const contentSecurityPolicy = buildFrontendContentSecurityPolicy(apiBaseUrl);
  const plugins: PluginOption[] = [react()];

  if (command === 'build' || mode === 'production') {
    plugins.push(applyContentSecurityPolicy(contentSecurityPolicy));
  }

  return {
    plugins,
  };
});
