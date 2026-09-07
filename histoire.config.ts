import path from 'path';
import { defineConfig } from 'histoire';
import { HstVue } from '@histoire/plugin-vue';
import { aliases } from './vite.shared';

// Local preview: the app aliases `vue` to the esm-bundler build, which reaches
// its API through a chain of star re-exports that histoire's node-side story
// collector cannot follow. The standalone browser build is a single file with
// every export inlined, so point the preview at that instead.
const previewAliases = {
  ...aliases,
  vue: path.resolve('./node_modules/vue/dist/vue.esm-browser.js'),
};

export default defineConfig({
  setupFile: './histoire.setup.ts',
  plugins: [HstVue()],
  collectMaxThreads: 4,
  vite: {
    resolve: {
      alias: previewAliases,
    },
    server: {
      port: 6179,
    },
    // Resolve deps to their ESM builds on the node side too, so the story
    // collector gets real named exports instead of CJS default wrappers.
    ssr: {
      resolve: {
        conditions: ['browser', 'module', 'import', 'default'],
        externalConditions: ['browser', 'module', 'import', 'default'],
      },
    },
  },
  // Local preview: the story collector runs browser-compiled components in
  // node, so let vite transform every dependency instead of leaving browser
  // bundles (and directory-style ESM entries) to node's own resolver.
  viteNodeInlineDeps: [/.*/],
  viteIgnorePlugins: ['vite-plugin-ruby'],
  theme: {
    darkClass: 'dark',
    title: '@chatwoot/design',
    logo: {
      square: './design-system/images/logo-thumbnail.svg',
      light: './design-system/images/logo.png',
      dark: './design-system/images/logo-dark.png',
    },
  },
  defaultStoryProps: {
    icon: 'carbon:cube',
    iconColor: '#1F93FF',
    layout: {
      type: 'grid',
      width: '80%',
    },
  },
  tree: {
    groups: [
      {
        id: 'top',
        title: '',
      },
      {
        id: 'components',
        title: 'Components',
        include: () => true,
      },
    ],
  },
});
