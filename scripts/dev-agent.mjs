import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const venvDir = path.join(root, 'agent', '.venv');
const python =
  process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python');

if (!existsSync(python)) {
  const created = spawnSync('python', ['-m', 'venv', venvDir], {
    stdio: 'inherit',
  });
  if (created.status !== 0) process.exit(created.status ?? 1);
}

const installed = spawnSync(
  python,
  ['-m', 'pip', 'install', '-q', '-r', path.join('agent', 'requirements.txt')],
  { stdio: 'inherit', cwd: root }
);
if (installed.status !== 0) process.exit(installed.status ?? 1);

const testOnly = process.argv.includes('--test');
const args = testOnly
  ? ['-m', 'pytest']
  : [
      '-m',
      'uvicorn',
      'flowchart_agent.app:app',
      '--app-dir',
      'agent',
      '--host',
      '127.0.0.1',
      '--port',
      '8000',
    ];
const child = spawn(python, args, {
  stdio: 'inherit',
  cwd: testOnly ? path.join(root, 'agent') : root,
});
child.on('exit', (code) => process.exit(code ?? 0));
