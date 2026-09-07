import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import yaml from '@rollup/plugin-yaml';
import { aliases, vueOptions } from './vite.shared';

// ApiClient derives the account id from window.location.pathname, which is
// always "/" once the demo switches the router to hash history. This rewrites
// those two reads to look at the hash instead. It is the only change the demo
// makes to shipped source.
const accountScopedUrlsFromHash = {
  name: 'demo-account-scoped-urls-from-hash',
  transform(code: string, id: string) {
    if (!id.endsWith('dashboard/api/ApiClient.js')) return null;
    const prelude =
      'const __demoPath = () => (window.location.hash || "").replace(/^#/, "") || window.location.pathname;\n';
    return (
      prelude +
      code
        .replaceAll(
          "window.location.pathname.includes('/app/accounts')",
          "__demoPath().includes('/app/accounts')"
        )
        .replaceAll("window.location.pathname.split('/')[3]", "__demoPath().split('/')[3]")
    );
  },
};

// Build of the real dashboard with its backend replaced in the browser.
// See demo/README.md.
export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [accountScopedUrlsFromHash, vue(vueOptions), yaml()],
  resolve: {
    alias: [
      // Hash routing so the build survives being mounted at any path.
      { find: /^vue-router$/, replacement: path.resolve('./demo/vue-router-hash.js') },
      // Only English is rendered in the preview; the other 40 locales would
      // triple the bundle.
      { find: /^dashboard\/i18n$/, replacement: path.resolve('./demo/i18n-en.js') },
      // No Rails server, so no websocket to connect to.
      {
        find: /^@rails\/actioncable$/,
        replacement: path.resolve('./demo/actioncable-stub.js'),
      },
      ...Object.entries(aliases).map(([find, replacement]) => ({ find, replacement })),
    ],
  },
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
    },
  },
  server: {
    fs: { allow: [path.resolve('.')] },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
  },
});
