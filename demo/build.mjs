// `npm run build` for the preview. demo/dist is committed, so this returns
// immediately unless the build output is missing (or FORCE_DEMO_BUILD is set).
// Compiling the dashboard takes ~20s plus a full install, which is more than a
// preview engine's build step should ever have to wait for.
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const exists = async path => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const built = await exists(resolve(HERE, 'dist/index.html'));
if (built && !process.env.FORCE_DEMO_BUILD) {
  console.log('demo/dist is present, nothing to build');
  process.exit(0);
}

const vite = resolve(ROOT, 'node_modules/.bin/vite');
if (!(await exists(vite))) {
  console.error('demo/dist is missing and node_modules is not installed');
  process.exit(1);
}

const child = spawn(vite, ['build', '--config', 'vite.demo.config.ts'], {
  cwd: ROOT,
  stdio: 'inherit',
});
child.on('exit', code => process.exit(code ?? 1));
