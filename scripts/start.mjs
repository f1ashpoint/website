// Production start: make sure the admin account exists, then run Next.js on the port the host gives us.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const seed = spawnSync(process.execPath, ['dist/seed.cjs'], { stdio: 'inherit', env: process.env });
if (seed.status !== 0) {
  console.error('\nStartup stopped: the admin account could not be created. Check ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters) and SESSION_SECRET (32+ characters) in your environment variables.');
  process.exit(1);
}
const port = process.env.PORT || '3000';
const next = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [next, 'start', '-H', '0.0.0.0', '-p', port], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => child.kill(sig));
child.on('exit', (code) => process.exit(code ?? 0));
