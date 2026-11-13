import { build } from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = await mkdtemp(join(tmpdir(), 'prosperitas-tests-'));
try {
    const entries = (await readdir('tests')).filter(name => name.endsWith('.test.ts')).sort();
    await build({ entryPoints: entries.map(name => join('tests', name)), bundle: true, platform: 'node', format: 'cjs', outdir: directory, outExtension: { '.js': '.cjs' }, logLevel: 'silent' });
    const result = spawnSync(process.execPath, ['--test', ...entries.map(name => join(directory, name.replace(/\.ts$/, '.cjs')))], { stdio: 'inherit' });
    process.exitCode = result.status ?? 1;
} finally {
    await rm(directory, { recursive: true, force: true });
}
