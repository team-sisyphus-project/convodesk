// The dashboard router is built with createWebHistory. The preview harness can
// mount the build at any path, so the demo swaps in hash history. An explicit
// export wins over the star re-export.
import { createWebHashHistory } from 'vue-router/dist/vue-router.mjs';

export * from 'vue-router/dist/vue-router.mjs';
export const createWebHistory = createWebHashHistory;
