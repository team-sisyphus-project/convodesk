// Preview entrypoint: build the demo bundle if it is missing, then serve it.
// The harness runs this single command, so it must be self-sufficient.
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const run = (command, args) =>
  new Promise((done, fail) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', code => (code === 0 ? done() : fail(new Error(`${command} exited ${code}`))));
    child.on('error', fail);
  });

const exists = async path => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  if (!(await exists(resolve(HERE, 'dist/index.html')))) {
    console.log('demo/dist is missing, building it first...');
    // Use the package manager's bin shim: it sets up NODE_PATH so that the
    // transitive postcss plugins the root postcss.config.js requires resolve.
    await run(resolve(ROOT, 'node_modules/.bin/vite'), [
      'build',
      '--config',
      'vite.demo.config.ts',
    ]);
  }
  await run(process.execPath, [resolve(HERE, 'server.mjs'), ...process.argv.slice(2)]);
};

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
