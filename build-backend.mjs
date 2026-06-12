import * as esbuild from 'esbuild';
import path from 'path';

await esbuild.build({
  entryPoints: ['api/boot.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  banner: {
    js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
  },
  alias: {
    '@db': path.resolve('./db'),
    '@contracts': path.resolve('./contracts'),
  },
  external: [],
});

console.log('Backend built to dist/boot.js');
