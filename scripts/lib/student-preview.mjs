// Browser acceptance harness. Native filesystem operations deliberately fail;
// tests using this preview must not claim native download/capture coverage.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
export async function startStudentPreview({ root, directory }) {
 const app = join(root, 'apps/student-app');
 let metro, metroLog = '';
async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function startPreview() {
  if (process.env.MOBILE_PREVIEW_URL) return process.env.MOBILE_PREVIEW_URL;
  const entry = join(directory, 'entry.ts');
  const capture = join(directory, 'capture.ts');
  const files = join(directory, 'files.ts');
  await writeFile(
    entry,
    `import { registerRootComponent } from ${JSON.stringify(join(app, 'node_modules/expo'))};
import App from ${JSON.stringify(join(app, 'App'))};
import { navigationRef } from ${JSON.stringify(join(app, 'src/navigation/ref'))};
(globalThis as any).__reviewNav = navigationRef;
registerRootComponent(App);`,
  );
  await writeFile(
    capture,
    'export function addScreenshotListener() { return { remove() {} }; }\nexport function usePreventScreenCapture() {}',
  );
  await writeFile(
    files,
    `export class Directory { uri: string; constructor(...parts: any[]) { this.uri = parts.map(p => p?.uri ?? p).join('/'); } async create() {} }
export class File { uri: string; constructor(...parts: any[]) { this.uri = parts.map(p => p?.uri ?? p).join('/'); } async copy() { throw new Error('Native downloads not tested'); } async delete() { throw new Error('Native files not tested'); } async info() { return { exists: false }; } }
export const Paths = { cache: { uri: 'review://cache' }, info: () => ({ exists: true }) };`,
  );
  const preload = join(directory, 'register.cjs');
  await writeFile(
    preload,
    `const Module = require('node:module'); const load = Module._load;
Module._load = function(request) {
 const result = load.apply(this, arguments);
 if (request.endsWith('/apps/student-app/metro.config.js')) {
  result.watchFolders = [...result.watchFolders, ${JSON.stringify(directory)}];
  const old = result.resolver.resolveRequest;
  result.resolver.resolveRequest = (context, name, platform) => {
   if (platform === 'web' && name === 'expo-screen-capture') return { type: 'sourceFile', filePath: ${JSON.stringify(capture)} };
   if (platform === 'web' && name === 'expo-file-system') return { type: 'sourceFile', filePath: ${JSON.stringify(files)} };
   if (platform === 'web' && (name === './index' || name === './index.ts') && context.originModulePath.includes('student-app')) return { type: 'sourceFile', filePath: ${JSON.stringify(entry)} };
   return old ? old(context, name, platform) : context.resolveRequest(context, name, platform);
  };
 }
 return result;
};`,
  );
  const port = await freePort();
  metro = spawn(
    process.execPath,
    [
      '--require',
      preload,
      join(app, 'node_modules/expo/bin/cli'),
      'start',
      '--offline',
      '--web',
      '--port',
      String(port),
      '--max-workers',
      '2',
    ],
    {
      cwd: app,
      env: {
        ...process.env,
        CI: '1',
        EXPO_NO_TELEMETRY: '1',
        __UNSAFE_EXPO_HOME_DIRECTORY: join(directory, 'expo'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  metro.stdout.on('data', (chunk) => (metroLog += chunk));
  metro.stderr.on('data', (chunk) => (metroLog += chunk));
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (metro.exitCode !== null) throw new Error(metroLog);
    try {
      if ((await fetch(url)).ok) return url;
    } catch {
      /* booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Metro startup timeout: ' + metroLog);
}
 try {
  const url = await startPreview();
  return { url, close: async () => {
   if (!metro || metro.exitCode !== null) return;
   metro.kill('SIGTERM');
   await new Promise(resolve => {
    const timer = setTimeout(() => { metro.kill('SIGKILL'); resolve(); }, 3000);
    metro.once('exit', () => { clearTimeout(timer); resolve(); });
   });
  } };
 } catch (error) { metro?.kill('SIGTERM'); throw error; }
}
