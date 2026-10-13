// Compiles scripts/seed.ts into dist/seed.cjs so production does not need tsx.
import { build } from 'esbuild';
await build({ entryPoints: ['scripts/seed.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'node20', external: ['better-sqlite3'], outfile: 'dist/seed.cjs', logLevel: 'warning' });
console.log('Built dist/seed.cjs');
