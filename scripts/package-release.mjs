import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const output = process.argv[2] ? resolve(process.argv[2]) : null;
if (!output || !output.toLowerCase().endsWith('.zip')) {
  throw new Error('Usage: npm run package:release -- <output.zip>');
}
if (existsSync(output)) throw new Error(`Refusing to overwrite existing file: ${output}`);

const pendingZip = `${output}.partial`;
if (existsSync(pendingZip)) throw new Error(`Temporary output already exists: ${pendingZip}`);
const work = mkdtempSync(join(tmpdir(), 'saved-shelf-x-release-'));
const app = join(work, 'Build/Products/Release/X Bookmark Shelf.app');
const appex = join(app, 'Contents/PlugIns/X Bookmark Shelf Extension.appex');
const appEntitlements = join(root, 'Xcode/X Bookmark Shelf/X Bookmark Shelf/X Bookmark Shelf.entitlements');
const extensionEntitlements = join(root, 'Xcode/X Bookmark Shelf/X Bookmark Shelf Extension/X Bookmark Shelf Extension.entitlements');
const project = join(root, 'Xcode/X Bookmark Shelf/X Bookmark Shelf.xcodeproj');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? result.signal}`);
}

function verifyEntitlement(bundle, key) {
  const result = spawnSync('codesign', ['-d', '--entitlements', ':-', bundle], { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`Could not inspect entitlements: ${bundle}`);
  const report = result.stdout + result.stderr;
  const marker = `<key>${key}</key>`;
  const start = report.indexOf(marker);
  const value = start < 0 ? '' : report.slice(start + marker.length).trimStart();
  if (!value.startsWith('<true/>') && !value.startsWith('<true />')) {
    throw new Error(`Missing enabled entitlement ${key} in ${bundle}`);
  }
}

try {
  run('npm', ['run', 'check']);
  run('npm', ['run', 'xcode:sync']);
  run('xcodebuild', [
    '-quiet', '-project', project, '-scheme', 'X Bookmark Shelf', '-configuration', 'Release',
    '-destination', 'generic/platform=macOS', '-derivedDataPath', work,
    'ARCHS=arm64 x86_64', 'ONLY_ACTIVE_ARCH=NO', 'CODE_SIGNING_ALLOWED=NO',
    `MARKETING_VERSION=${version}`, 'CURRENT_PROJECT_VERSION=4', 'build'
  ]);
  run('codesign', ['--force', '--sign', '-', '--entitlements', extensionEntitlements, appex]);
  run('codesign', ['--force', '--sign', '-', '--entitlements', appEntitlements, app]);
  run('codesign', ['--verify', '--deep', '--strict', app]);
  verifyEntitlement(appex, 'com.apple.security.app-sandbox');
  verifyEntitlement(app, 'com.apple.security.app-sandbox');
  verifyEntitlement(app, 'com.apple.security.network.client');

  mkdirSync(dirname(output), { recursive: true });
  run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, pendingZip]);
  run('unzip', ['-tqq', pendingZip]);
  renameSync(pendingZip, output);
  run('shasum', ['-a', '256', output]);
  console.log(`Created ${basename(output)} at ${output}`);
} finally {
  rmSync(work, { recursive: true, force: true });
  rmSync(pendingZip, { force: true });
}
